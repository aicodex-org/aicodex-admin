import {expect, test} from "@jest/globals";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("uses the bounded Bun install contract in Docker and Makefile", () => {
  const dockerfile = read("deploy/Dockerfile");
  const makefile = read("Makefile");

  expect(dockerfile).toContain("oven/bun:1.3.14");
  expect(dockerfile).toContain("COPY --from=bun");
  expect(dockerfile).toContain("./web-admin/bun.lock");
  expect(dockerfile).toContain("./web-admin/scripts/install-with-retry.cjs");
  expect(dockerfile).toContain("bun run deps:install");
  expect(dockerfile).toContain("bun run build");
  expect(dockerfile).not.toMatch(/\byarn\b/i);
  expect(dockerfile).not.toContain("yarn.lock");

  expect(makefile).toContain("bun run deps:install");
  expect(makefile).toContain("bun run build");
  expect(makefile).not.toMatch(/\byarn\b/i);
});

test("uses Bun for Playwright and both Windows local-dev entrypoints", () => {
  const playwrightConfig = read("web-admin/playwright.config.ts");
  const remoteFrontend = read("local-dev/start-frontend-remote-backend.ps1");
  const localDev = read("local-dev/start-windows-local-dev.ps1");

  expect(playwrightConfig).toContain("command: \"bun run start\"");
  expect(playwrightConfig).not.toMatch(/\byarn\b/i);

  expect(remoteFrontend).toContain("Get-Command 'bun.exe'");
  expect(remoteFrontend).toContain("bun.Source");
  expect(remoteFrontend).not.toContain("yarn.cmd");
  expect(remoteFrontend).not.toContain("npm.cmd");

  expect(localDev).toContain("Get-Command 'bun.exe'");
  expect(localDev).toContain("bun.Source");
  expect(localDev).not.toContain("yarn.cmd");
  expect(localDev).not.toContain("npm.cmd");
});
