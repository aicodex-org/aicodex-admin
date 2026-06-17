#!/usr/bin/env node

import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function isNewFileStatus(status) {
  return status === "A" || status === "C" || status === "??" || status.startsWith("R");
}

function containsJsx(content) {
  return /<[A-Za-z][A-Za-z0-9.:-]*[\s/>]/.test(content) || /<React\./.test(content);
}

function containsReactRenderTest(content) {
  return content.includes("@testing-library/react") || /\brender\s*\(\s*</.test(content);
}

function looksLikePureLogicModule(filePath, content) {
  const baseName = path.basename(filePath).toLowerCase();
  if (baseName.includes("utils") || baseName.includes("model") || baseName.includes("types")) {
    return true;
  }
  return /\bexport\s+(function|const|let|class|type|interface)\b/.test(content) || /\bexport\s+default\b/.test(content);
}

export function analyzeChangedFiles(files) {
  const errors = [];

  for (const file of files) {
    const filePath = normalizePath(file.path);
    const extension = path.extname(filePath);
    const content = file.content || "";
    const isJavaScript = extension === ".js" || extension === ".jsx";

    if (!filePath.startsWith("src/") || !isJavaScript || !isNewFileStatus(file.status)) {
      continue;
    }

    const isTestFile = /\.test\.(js|jsx)$/.test(filePath);
    const hasJsx = containsJsx(content);
    const hasReactRender = containsReactRenderTest(content);

    if (isTestFile && (hasJsx || hasReactRender)) {
      errors.push({
        path: filePath,
        expectedExtension: ".test.tsx",
        reason: "new React tests with JSX or render(<...>) must use .test.tsx",
      });
      continue;
    }

    if (isTestFile) {
      errors.push({
        path: filePath,
        expectedExtension: ".test.ts",
        reason: "new pure logic tests must use .test.ts",
      });
      continue;
    }

    if (hasJsx) {
      errors.push({
        path: filePath,
        expectedExtension: ".tsx",
        reason: "new React components/pages must use .tsx",
      });
      continue;
    }

    if (looksLikePureLogicModule(filePath, content)) {
      errors.push({
        path: filePath,
        expectedExtension: ".ts",
        reason: "new shared logic and utility modules must use .ts",
      });
    }
  }

  return {errors};
}

function runGit(args, cwd) {
  return execFileSync("git", args, {cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
}

function parseNameStatus(output) {
  if (!output) {
    return [];
  }

  return output.split(/\r?\n/).filter(Boolean).map(line => {
    const parts = line.split(/\t+/);
    const status = parts[0];
    const filePath = parts.length >= 3 ? parts[2] : parts[1];
    return {status, path: normalizePath(filePath)};
  });
}

function collectChangedFiles(cwd, baseRef) {
  const changed = new Map();
  const diffArgs = ["diff", "--name-status", "--diff-filter=ACMR", baseRef, "--", "src"];

  for (const file of parseNameStatus(runGit(diffArgs, cwd))) {
    changed.set(file.path, file);
  }

  const untracked = runGit(["ls-files", "--others", "--exclude-standard", "src"], cwd);
  for (const filePath of untracked.split(/\r?\n/).filter(Boolean)) {
    const normalized = normalizePath(filePath);
    changed.set(normalized, {status: "??", path: normalized});
  }

  return Array.from(changed.values()).map(file => ({
    ...file,
    content: fs.existsSync(path.join(cwd, file.path)) ? fs.readFileSync(path.join(cwd, file.path), "utf8") : "",
  }));
}

function parseArgs(argv) {
  const options = {base: "origin/hfl-test-base", json: false};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base") {
      options.base = argv[index + 1] || options.base;
      index += 1;
    } else if (arg.startsWith("--base=")) {
      options.base = arg.slice("--base=".length);
    } else if (arg === "--json") {
      options.json = true;
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const findings = analyzeChangedFiles(collectChangedFiles(cwd, options.base));

  if (options.json) {
    process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
  } else if (findings.errors.length > 0) {
    process.stderr.write("Incremental TypeScript gate failed:\n");
    for (const error of findings.errors) {
      process.stderr.write(`- ${error.path}: ${error.reason}; expected ${error.expectedExtension}\n`);
    }
  }

  if (findings.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main();
}
