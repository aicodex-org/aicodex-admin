import {testConfig} from "../config/vitest/testConfig";
import fileMock from "../config/vitest/fileMock";
import styleMock from "../config/vitest/styleMock";
import styleModuleProxy from "../config/vitest/styleModuleProxy";
import svgFileMock, {ReactComponent as SvgReactComponent} from "../config/vitest/svgMock";
import {describe, expect, test} from "vitest";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

interface PackageJson {
  browserslist?: {production?: string[]};
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines?: {node?: string};
  eslintConfig?: unknown;
  scripts: Record<string, string>;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "web-admin/package.json"), "utf8")
) as PackageJson;
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/build.yml"), "utf8");
const viteConfig = fs.readFileSync(path.join(repoRoot, "web-admin/vite.config.ts"), "utf8");
const vitestConfigPath = path.join(repoRoot, "web-admin/vitest.config.ts");
const appEntry = fs.readFileSync(path.join(repoRoot, "web-admin/src/index.tsx"), "utf8");

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
  test("provides Vitest-only watch and non-watch CI entries", () => {
    expect(packageJson.scripts.test).toBe("vitest");
    expect(packageJson.scripts["test:ci"]).toBe("vitest run");
    expect(packageJson.scripts["test:ci"]).not.toMatch(
      /jest|react-scripts|bun test|--silent|--passWithNoTests/
    );
  });

  test("owns the typed Vitest environment, discovery, serial and coverage contract", () => {
    expect(fs.existsSync(vitestConfigPath)).toBe(true);
    if (!fs.existsSync(vitestConfigPath)) {
      return;
    }

    expect(testConfig.include).toEqual([
      "src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ]);
    expect(testConfig.environment).toBe("jsdom");
    expect(testConfig.environmentOptions).toEqual({jsdom: {url: "http://localhost"}});
    expect(testConfig.setupFiles).toEqual(["src/setupTests.ts"]);
    expect(testConfig.globals).toBe(false);
    expect(testConfig.maxWorkers).toBe(1);
    expect(testConfig.fileParallelism).toBe(false);
    expect(testConfig.sequence).toEqual({concurrent: false});
    expect(testConfig.isolate).toBe(true);
    expect(testConfig.mockReset).toBe(true);
    expect(testConfig.coverage).toEqual({
      provider: "v8",
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
        "src/**/__tests__/**",
      ],
      reportsDirectory: "coverage",
      reporter: ["text", "json", "lcov", "clover"],
    });
  });

  test("provides typed CSS module, style, file and SVG support", () => {
    const supportDir = path.join(repoRoot, "web-admin/config/vitest");
    ["testConfig.ts", "styleModuleProxy.ts", "styleMock.ts", "fileMock.ts", "svgMock.tsx"].forEach(file => {
      expect(fs.existsSync(path.join(supportDir, file))).toBe(true);
    });
    expect(styleModuleProxy.applicationCard).toBe("applicationCard");
    expect(styleMock).toEqual({});
    expect(fileMock).toBe("test-file-stub");
    expect(svgFileMock).toBe("test-file-stub.svg");
    expect(SvgReactComponent({role: "img"})).toMatchObject({
      type: "svg",
      props: {role: "img"},
    });
  });

  test("keeps the Vite browser boundary free of retired CRA and IE polyfills", () => {
    expect(appEntry).not.toContain("react-app-polyfill/ie9");
    expect(appEntry).not.toContain("react-app-polyfill/ie11");
    expect(appEntry).not.toContain("react-app-polyfill/stable");
    expect(appEntry).toContain("import \"core-js/es\"");
    expect(appEntry).toContain("if (!String.prototype.replaceAll)");
    expect(packageJson.dependencies["react-app-polyfill"]).toBeUndefined();
    expect(viteConfig).toContain("target: \"es2020\"");
    expect(packageJson.browserslist?.production).toContain("not dead");
    expect(packageJson.browserslist?.production?.join(" ")).not.toMatch(/\bie\b/i);
  });

  test("declares exact Vitest dependencies and removes Jest runner ownership", () => {
    expect(packageJson.dependencies["react-scripts"]).toBeUndefined();
    expect(packageJson.devDependencies).toMatchObject({
      "@testing-library/jest-dom": "6.9.1",
      "@vitest/coverage-v8": "4.1.10",
      "jsdom": "28.1.0",
      "vitest": "4.1.10",
    });
    [
      "@jest/globals",
      "babel-jest",
      "babel-preset-react-app",
      "identity-obj-proxy",
      "jest",
      "jest-environment-jsdom",
      "jest-watch-typeahead",
    ].forEach(name => expect(packageJson.devDependencies[name]).toBeUndefined());
    expect(packageJson.engines?.node).toBe("^20.19.0 || ^22.12.0 || >=24.0.0");
    expect(packageJson.eslintConfig).toBeUndefined();
  });

  test("runs frontend checks independently from Go tests", () => {
    const frontendChecks = readJob("frontend-checks");

    expect(frontendChecks).not.toBe("");
    expect(frontendChecks).not.toMatch(/^ {4}needs:/m);
    expect(frontendChecks).toContain("uses: actions/checkout@v4");
    expect(frontendChecks).toContain("fetch-depth: 0");
    expect(frontendChecks).toContain("uses: oven-sh/setup-bun@v2");
    expect(frontendChecks).toContain("bun-version: \"1.3.14\"");
    expect(frontendChecks).toContain("bun run deps:install");
    expect(frontendChecks).not.toContain("cache: \"yarn\"");
    expect(frontendChecks).not.toContain("yarn.lock");
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

  test("runs explicit Vite-era static, public script and Vitest gates before the frontend build", () => {
    const frontendChecks = readJob("frontend-checks");
    const frontend = readJob("frontend");

    expect(frontendChecks).toContain("bun run typecheck");
    expect(frontendChecks).toContain("bun run typecheck:build-tooling");
    expect(frontendChecks).toContain("bun run public-scripts:check");
    expect(frontendChecks).toContain("bun run public-scripts:build");
    expect(frontendChecks).toContain("bun run public-scripts:smoke");
    expect(frontendChecks).toContain("bun run lint");
    expect(frontendChecks).toContain("bun run test:ci");
    expect(frontendChecks).toContain("- name: Vitest");
    expect(frontendChecks).not.toContain("- name: Jest");
    expect(frontend).toContain("needs: [go-tests, frontend-checks]");
    expect(frontend).toContain("uses: oven-sh/setup-bun@v2");
    expect(frontend).toContain("bun run deps:install");
    expect(frontend).toContain("bun run build");
  });

  test("runs the complete Playwright suite against the disposable CI database", () => {
    const e2e = readJob("e2e");

    expect(e2e).not.toBe("");
    expect(e2e).toContain("MYSQL_DATABASE: aicodex_admin");
    expect(e2e).toContain("node-version: 20.19.0");
    expect(e2e).toContain("uses: oven-sh/setup-bun@v2");
    expect(e2e).toContain("bun run deps:install");
    expect(e2e).toContain("hashFiles('web-admin/bun.lock')");
    expect(e2e).toContain("bun x --no-install playwright install --with-deps chromium");
    expect(e2e).toContain("bun run typecheck:e2e");
    expect(e2e).toContain("AICODEX_ADMIN_E2E_DISPOSABLE_DB: \"1\"");
    expect(e2e).toContain("bun run test:e2e");
    expect(e2e).toContain("path: ./web-admin/output/playwright");
    expect(e2e).toContain("retention-days: 7");
    expect(e2e).not.toContain("cypress-io/github-action");
    expect(e2e).not.toContain("cypress-screenshots");
    expect(e2e).not.toContain("cypress-videos");
  });

  test("keeps the workflow free of active Yarn package-manager entries", () => {
    expect(workflow).not.toMatch(/\byarn\b/i);
    expect(workflow).not.toContain("yarn.lock");
  });

  test("resolves the browser Buffer package instead of Vite's Node builtin shim", () => {
    expect(viteConfig).toContain("buffer: \"buffer/\"");
  });

  test("keeps retired wallet authentication dependencies out of the Vite build boundary", () => {
    expect(packageJson.dependencies["@metamask/eth-sig-util"]).toBeUndefined();
    expect(packageJson.dependencies.ethers).toBeUndefined();
    expect(Object.keys(packageJson.dependencies).filter(name => name.startsWith("@web3-onboard/"))).toEqual([]);
    expect(viteConfig).not.toContain("@metamask/eth-sig-util");

    expect(packageJson.dependencies.buffer).toBe("^6.0.3");
    expect(packageJson.dependencies["react-metamask-avatar"]).toBe("^1.2.1");
    expect(viteConfig).toContain("include: [\"buffer\"]");
    expect(viteConfig).toContain("global: \"globalThis\"");
    expect(viteConfig).toContain("transformMixedEsModules: true");
  });
});
