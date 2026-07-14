/* eslint-env jest */
import {expect} from "@jest/globals";
import fs from "fs";
import path from "path";

interface PackageJson {
  scripts: Record<string, string>;
}

const repoRoot = path.resolve(__dirname, "../..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "web-admin/package.json"), "utf8")
) as PackageJson;
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/build.yml"), "utf8");

const readJob = (jobName: string): string => {
  const lines = workflow.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${jobName}:`);

  if (start < 0) {
    return "";
  }

  const end = lines.findIndex((line, index) => index > start && /^ {2}[a-zA-Z][\w-]*:$/.test(line));
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
};

describe("web-admin CI gates", () => {
  test("provides a fixed non-watch single-process Jest entry for CI", () => {
    expect(packageJson.scripts["test:ci"]).toBe(
      "cross-env CI=true craco test --watchAll=false --runInBand --silent"
    );
  });

  test("runs frontend checks independently from Go tests", () => {
    const frontendChecks = readJob("frontend-checks");

    expect(frontendChecks).not.toBe("");
    expect(frontendChecks).not.toMatch(/^ {4}needs:/m);
    expect(frontendChecks).toContain("uses: actions/checkout@v4");
    expect(frontendChecks).toContain("fetch-depth: 0");
    expect(frontendChecks).toContain("yarn install --frozen-lockfile");
  });

  test("uses event-aware revisions for the incremental TypeScript gate", () => {
    const frontendChecks = readJob("frontend-checks");

    expect(frontendChecks).toContain("github.event.pull_request.base.sha");
    expect(frontendChecks).toContain("github.event.before");
    expect(frontendChecks).toContain("set -euo pipefail");
    expect(frontendChecks).toContain("[[ \"$sha\" =~ ^[0-9a-fA-F]{40}$ ]]");
    expect(frontendChecks).toContain("[[ ! \"$sha\" =~ ^0{40}$ ]]");
    expect(frontendChecks).toContain("git cat-file -e");
    expect(frontendChecks).toContain("git rev-parse HEAD^");
    expect(frontendChecks).toContain("::error::");
    expect(frontendChecks).not.toContain("if [[ \"${{ github.event_name }}\"");
    expect(frontendChecks).toContain(
      "BASE_SHA: ${{ steps.ts-gate-base.outputs.base_sha }}"
    );
    expect(frontendChecks).toContain("node scripts/check-incremental-typescript-gate.mjs --base \"$BASE_SHA\"");
  });

  test("runs typecheck and Jest before allowing the frontend build", () => {
    const frontendChecks = readJob("frontend-checks");
    const frontend = readJob("frontend");

    expect(frontendChecks).toContain("yarn typecheck");
    expect(frontendChecks).toContain("yarn test:ci");
    expect(frontend).toContain("needs: [go-tests, frontend-checks]");
  });
});
