import { readFileSync, writeFileSync } from "node:fs";

import { parse } from "yaml";

const asyncApiUrl = new URL("./asyncapi.yaml", import.meta.url);
const outputUrl = new URL("./src/stomp.generated.ts", import.meta.url);

const asyncApi = parse(readFileSync(asyncApiUrl, "utf8"));
const schemas = asyncApi.components.schemas;

function referenceName(reference) {
  const prefix = "#/components/schemas/";

  if (!reference.startsWith(prefix)) {
    throw new Error(`지원하지 않는 참조입니다: ${reference}`);
  }

  return reference.slice(prefix.length);
}

function propertyName(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function objectType(schema) {
  const properties = Object.entries(schema.properties ?? {});

  if (properties.length === 0) {
    return "Record<string, unknown>";
  }

  const required = new Set(schema.required ?? []);

  return `{
${properties.map(([name, property]) => `  ${propertyName(name)}${required.has(name) ? "" : "?"}: ${toType(property)};`).join("\n")}
}`;
}

function toType(schema) {
  if (schema.$ref) {
    return referenceName(schema.$ref);
  }

  if (schema.enum) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (schema.oneOf) {
    return schema.oneOf.map(toType).join(" | ");
  }

  if (schema.allOf) {
    return schema.allOf.map(toType).join(" & ");
  }

  if (schema.type === "array") {
    return `Array<${toType(schema.items ?? {})}>`;
  }

  if (schema.type === "object") {
    return objectType(schema);
  }

  if (schema.type === "string") {
    return "string";
  }

  if (schema.type === "integer" || schema.type === "number") {
    return "number";
  }

  if (schema.type === "boolean") {
    return "boolean";
  }

  return "unknown";
}

function declaration(name, schema) {
  if (schema.type === "object" && !schema.enum && !schema.oneOf && !schema.allOf) {
    return `export interface ${name} ${objectType(schema)}`;
  }

  return `export type ${name} = ${toType(schema)};`;
}

const source = [
  "/**",
  " * This file was generated from asyncapi.yaml.",
  " * Do not make direct changes to this file.",
  " */",
  "",
  ...Object.entries(schemas).map(([name, schema]) => declaration(name, schema)),
  "",
].join("\n\n");

writeFileSync(outputUrl, source);
