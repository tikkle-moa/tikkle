import { readFileSync, writeFileSync } from "node:fs";

import { TypeScriptGenerator } from "@asyncapi/modelina";
import { DiagnosticSeverity, Parser } from "@asyncapi/parser";

const asyncApiDocumentUrl = "http://localhost:8080/api/springwolf/docs";
const outputUrl = new URL("./src/stomp.generated.ts", import.meta.url);
const checkOnly = process.argv.includes("--check");

const response = await fetch(asyncApiDocumentUrl);

if (!response.ok) {
  throw new Error(`Springwolf AsyncAPI 문서를 불러오지 못했습니다: ${response.status} ${response.statusText}`);
}

const asyncApi = await response.json();
const parser = new Parser();
const { diagnostics } = await parser.parse(asyncApi);
const errors = diagnostics.filter(({ severity }) => severity === DiagnosticSeverity.Error);

if (errors.length > 0) {
  throw new Error(["Springwolf AsyncAPI 문서 검증에 실패했습니다.", ...errors.map(({ message }) => `- ${message}`)].join("\n"));
}

if (checkOnly) {
  process.exit(0);
}

const generator = new TypeScriptGenerator({
  modelType: "interface",
  enumType: "union",
  mapType: "record",
});

const models = await generator.generate(asyncApi);

const source = [
  "/**",
  " * This file was generated from the Springwolf AsyncAPI document.",
  ` * Source: ${asyncApiDocumentUrl}`,
  " * Do not make direct changes to this file.",
  " */",
  "",
  ...models.map(({ result }) => `export ${result}`),
  "",
].join("\n");

writeFileSync(outputUrl, source);
