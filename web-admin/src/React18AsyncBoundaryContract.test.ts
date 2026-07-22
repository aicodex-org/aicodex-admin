import {expect, test} from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  findReactActWarningSuppressions,
  getAntdWarnings,
  getReactActWarnings
} from "./testUtils/reactAsyncWarnings";
import {fileURLToPath} from "url";
const testFilePath = fileURLToPath(import.meta.url);
const testFileDirectory = path.dirname(testFilePath);

function listTestSources(directory: string): string[] {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTestSources(entryPath);
    }
    return /\.test\.tsx?$/.test(entry.name) && entryPath !== testFilePath ? [entryPath] : [];
  });
}

test("does not suppress React act diagnostics with a text-matched return", () => {
  const suppressions = listTestSources(testFileDirectory).flatMap(filePath => {
    return findReactActWarningSuppressions(fs.readFileSync(filePath, "utf8"))
      .map(line => `${path.relative(testFileDirectory, filePath)}:${line}`);
  });

  expect(suppressions).toEqual([]);
});

test("classifies React act warnings without hiding other console diagnostics", () => {
  const calls = [
    ["Warning: An update to Panel inside a test was not wrapped in act(...)."],
    ["Warning: [antd: Card] bodyStyle is deprecated"],
    ["Warning: ", "The current testing environment is not configured to support act(...)"],
  ];

  expect(getReactActWarnings(calls)).toEqual([
    "Warning: An update to Panel inside a test was not wrapped in act(...).",
    "Warning:  The current testing environment is not configured to support act(...)",
  ]);
  expect(calls).toHaveLength(3);
});

test("classifies AntD runtime warnings without hiding React or other diagnostics", () => {
  const calls = [
    ["Warning: [antd: Card] bodyStyle is deprecated"],
    ["Warning: An update to Panel inside a test was not wrapped in act(...)."],
    ["An unrelated runtime diagnostic"],
  ];

  expect(getAntdWarnings(calls)).toEqual([
    "Warning: [antd: Card] bodyStyle is deprecated",
  ]);
  expect(calls).toHaveLength(3);
});

test("distinguishes a text-matched return from a diagnostic assertion", () => {
  const actWarning = ["not wrapped", "in act"].join(" ");
  const suppressedSource = [
    "const message = String(args[0]);",
    `if (message.includes("${actWarning}")) {`,
    "  return;",
    "}",
  ].join("\n");
  const assertedSource = `expect(message).toContain("${actWarning}");`;

  expect(findReactActWarningSuppressions(suppressedSource)).toEqual([2]);
  expect(findReactActWarningSuppressions(assertedSource)).toEqual([]);
});
