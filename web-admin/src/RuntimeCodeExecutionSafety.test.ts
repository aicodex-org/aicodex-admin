/* eslint-env jest */
// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {expect, test} from "@jest/globals";
import fs from "fs";
import path from "path";
import ts from "typescript";

type RuntimeExecutionKind = "direct eval" | "Function constructor";

interface RuntimeExecutionFinding {
  column: number;
  file: string;
  kind: RuntimeExecutionKind;
  line: number;
}

const isProductionTypeScript = (file: string): boolean => {
  return /\.tsx?$/.test(file) &&
    !/\.(?:test|spec)\.tsx?$/.test(file) &&
    !/\.d\.ts$/.test(file);
};

const listProductionTypeScript = (directory: string): string[] => {
  return fs.readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listProductionTypeScript(absolutePath);
      }
      return isProductionTypeScript(absolutePath) ? [absolutePath] : [];
    })
    .sort();
};

const findRuntimeCodeExecution = (sourceFile: ts.SourceFile, displayPath: string): RuntimeExecutionFinding[] => {
  const findings: RuntimeExecutionFinding[] = [];

  const addFinding = (node: ts.Node, kind: RuntimeExecutionKind): void => {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    findings.push({
      column: position.character + 1,
      file: displayPath,
      kind,
      line: position.line + 1,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "eval") {
      addFinding(node, "direct eval");
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        ts.isIdentifier(node.expression) && node.expression.text === "Function") {
      addFinding(node, "Function constructor");
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
};

const parseTypeScript = (file: string, source: string): ts.SourceFile => {
  const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
};

test("distinguishes runtime string execution from comments, strings and property calls", () => {
  const sourceFile = parseTypeScript("fixture.ts", `
    const note = "eval(value) and new Function(value)";
    object.eval(value);
    eval("value");
    Function("return value");
    new Function("return value");
  `);

  expect(findRuntimeCodeExecution(sourceFile, "fixture.ts").map(({kind}) => kind)).toEqual([
    "direct eval",
    "Function constructor",
    "Function constructor",
  ]);
});

test("keeps production TypeScript free of runtime string execution", () => {
  const sourceRoot = path.resolve(__dirname);
  const findings = listProductionTypeScript(sourceRoot).flatMap((file) => {
    const relativePath = path.relative(sourceRoot, file).replaceAll(path.sep, "/");
    const sourceFile = parseTypeScript(file, fs.readFileSync(file, "utf8"));
    return findRuntimeCodeExecution(sourceFile, relativePath);
  });

  expect(findings).toEqual([]);
});
