import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { TypeScriptGenerator, typeScriptDefaultModelNameConstraints } from "@asyncapi/modelina";
import { DiagnosticSeverity, Parser } from "@asyncapi/parser";
import { format, resolveConfig } from "prettier";

const asyncApiDocumentUrl = "http://localhost:8080/api/springwolf/docs";
const outputUrl = new URL("./src/stomp.generated.ts", import.meta.url);
const outputPath = fileURLToPath(outputUrl);
const checkOnly = process.argv.includes("--check");

const hasOwn = (value, property) => Object.prototype.hasOwnProperty.call(value, property);

const isMultiFormatSchema = (value) =>
  value && typeof value === "object" && !Array.isArray(value) && hasOwn(value, "schema") && typeof value.schemaFormat === "string";

const normalizeSchema = (value) => {
  if (isMultiFormatSchema(value)) {
    return normalizeSchema(value.schema);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSchema);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const normalized = Object.fromEntries(Object.entries(value).map(([property, propertyValue]) => [property, normalizeSchema(propertyValue)]));

  if (normalized.discriminator && typeof normalized.discriminator === "object" && normalized.discriminator.propertyName) {
    normalized.discriminator = normalized.discriminator.propertyName;
  }

  if (normalized.type === undefined && normalized.properties) {
    normalized.type = "object";
  }

  return normalized;
};

const mergeAllOfSchema = (target, source) => {
  if (source.type !== undefined) {
    target.type = source.type;
  }

  if (source.properties) {
    target.properties = {
      ...target.properties,
      ...source.properties,
    };
  }

  if (source.required) {
    target.required = [...new Set([...(target.required ?? []), ...source.required])];
  }

  for (const property of ["oneOf", "anyOf", "not", "items", "additionalProperties", "discriminator"]) {
    if (source[property] !== undefined) {
      target[property] = source[property];
    }
  }

  return target;
};

const normalizeSpringwolfDocument = (document) => {
  const rawSchemas = Object.fromEntries(Object.entries(document.components?.schemas ?? {}).map(([name, schema]) => [name, normalizeSchema(schema)]));
  const resolvingSchemas = new Set();

  const normalizeComponentSchema = (name) => {
    if (resolvingSchemas.has(name)) {
      return { $ref: `#/components/schemas/${name}` };
    }

    const schema = rawSchemas[name];

    if (!schema) {
      return { $ref: `#/components/schemas/${name}` };
    }

    resolvingSchemas.add(name);

    const merged = {};
    for (const part of schema.allOf ?? []) {
      const normalizedPart =
        typeof part?.$ref === "string" && part.$ref.startsWith("#/components/schemas/")
          ? normalizeComponentSchema(part.$ref.slice("#/components/schemas/".length))
          : normalizeSchema(part);

      mergeAllOfSchema(merged, normalizedPart);
    }

    const ownSchema = normalizeSchema(Object.fromEntries(Object.entries(schema).filter(([property]) => property !== "allOf")));
    mergeAllOfSchema(merged, ownSchema);

    for (const property of ["title", "description", "example", "examples", "format", "deprecated", "enum"]) {
      if (ownSchema[property] !== undefined) {
        merged[property] = ownSchema[property];
      }
    }

    if (merged.type === undefined && merged.properties) {
      merged.type = "object";
    }

    resolvingSchemas.delete(name);
    return merged;
  };

  document.components = {
    ...document.components,
    schemas: Object.fromEntries(Object.keys(rawSchemas).map((name) => [name, normalizeComponentSchema(name)])),
  };

  for (const [messageName, message] of Object.entries(document.components.messages ?? {})) {
    if (!message.payload) {
      continue;
    }

    const payload = normalizeSchema(message.payload);
    if (payload.oneOf && payload.title === undefined) {
      payload.title = messageName.replace(/Object$/, "");
    }

    message.payload = payload;
  }

  const channelPrefixes = Object.entries(document.channels ?? {})
    .filter(([, channel]) => typeof channel.address === "string")
    .map(([channelId, channel]) => ({
      channelId,
      prefix: `#/channels/${channel.address}/messages/`,
    }));

  const normalizeChannelReference = (reference) => {
    const channel = channelPrefixes.find(({ prefix }) => reference.startsWith(prefix));

    if (!channel) {
      return reference;
    }

    return `#/channels/${channel.channelId}/messages/${reference.slice(channel.prefix.length)}`;
  };

  const normalizeReferences = (value) => {
    if (Array.isArray(value)) {
      return value.map(normalizeReferences);
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([property, propertyValue]) => [
        property,
        property === "$ref" && typeof propertyValue === "string" ? normalizeChannelReference(propertyValue) : normalizeReferences(propertyValue),
      ]),
    );
  };

  return normalizeReferences(document);
};

const validateAsyncApi = async (document, description) => {
  const parser = new Parser();
  const { diagnostics } = await parser.parse(document);
  const errors = diagnostics.filter(({ severity }) => severity === DiagnosticSeverity.Error);

  if (errors.length > 0) {
    throw new Error([`${description} 검증에 실패했습니다.`, ...errors.map(({ message }) => `- ${message}`)].join("\n"));
  }
};

const response = await fetch(asyncApiDocumentUrl);

if (!response.ok) {
  throw new Error(`Springwolf AsyncAPI 문서를 불러오지 못했습니다: ${response.status} ${response.statusText}`);
}

const asyncApi = normalizeSpringwolfDocument(await response.json());

await validateAsyncApi(asyncApi, "Springwolf AsyncAPI 문서");

const constrainModelName = typeScriptDefaultModelNameConstraints();

const generator = new TypeScriptGenerator({
  modelType: "interface",
  processorOptions: {
    jsonSchema: {
      ignoreAdditionalProperties: true,
    },
  },
  constraints: {
    modelName: (context) =>
      constrainModelName({
        ...context,
        modelName: context.modelName.split(".").at(-1) ?? context.modelName,
      }),
  },
});

const models = await generator.generate(asyncApi);

const getSimpleModelName = (name) => name.split(".").at(-1) ?? name;

const requiredPropertiesByModel = new Map(
  Object.entries(asyncApi.components?.schemas ?? {}).map(([name, schema]) => [getSimpleModelName(name), new Set(schema.required ?? [])]),
);

const normalizeRequiredProperties = (result, modelName) => {
  const requiredProperties = requiredPropertiesByModel.get(modelName);

  if (!requiredProperties?.size) {
    return result;
  }

  return result.replace(/^(\s*)([A-Za-z_$][\w$]*)\?:/gm, (property, indentation, propertyName) =>
    requiredProperties.has(propertyName) ? `${indentation}${propertyName}:` : property,
  );
};

const modelSources = models
  .map(({ result, modelName }) => normalizeRequiredProperties(result, modelName).trim())
  .filter((result) => !/^type Root = any;?$/.test(result));

if (modelSources.length === 0) {
  throw new Error("Springwolf 문서에서 생성할 STOMP 메시지 모델을 찾지 못했습니다.");
}

const unformattedSource = [
  "/**",
  " * This file was generated from the Springwolf AsyncAPI document.",
  ` * Source: ${asyncApiDocumentUrl}`,
  " * Do not make direct changes to this file.",
  " */",
  "",
  ...modelSources.map((result) => `export ${result}`),
  "",
].join("\n");

const prettierConfig = (await resolveConfig(outputPath)) ?? {};
const source = await format(unformattedSource, {
  ...prettierConfig,
  parser: "typescript",
});

if (checkOnly) {
  const currentSource = readFileSync(outputPath, "utf8");

  if (currentSource !== source) {
    throw new Error("stomp.generated.ts가 Springwolf AsyncAPI 문서와 일치하지 않습니다. pnpm api:async를 실행하세요.");
  }

  process.exit(0);
}

writeFileSync(outputPath, source);
