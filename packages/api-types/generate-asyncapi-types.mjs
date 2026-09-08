import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { TypeScriptGenerator, typeScriptDefaultModelNameConstraints } from "@asyncapi/modelina";
import { DiagnosticSeverity, Parser } from "@asyncapi/parser";
import { format, resolveConfig } from "prettier";

const asyncApiDocumentUrl = "http://localhost:8080/api/springwolf/docs";
const outputUrl = new URL("./src/stomp.generated.ts", import.meta.url);
const outputPath = fileURLToPath(outputUrl);
const checkOnly = process.argv.includes("--check");

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

const asyncApi = await response.json();

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
