/* eslint-env jest */
import {expect} from "@jest/globals";
import fs from "fs";
import path from "path";

interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  eslintConfig?: unknown;
  scripts: Record<string, string>;
}

interface JestConfig {
  collectCoverageFrom?: string[];
  coverageDirectory?: string;
  coverageProvider?: string;
  coverageReporters?: string[];
  moduleFileExtensions?: string[];
  moduleNameMapper?: Record<string, string>;
  resetMocks?: boolean;
  roots?: string[];
  setupFiles?: string[];
  setupFilesAfterEnv?: string[];
  testEnvironment?: string;
  testEnvironmentOptions?: {url?: string};
  testMatch?: string[];
  testPathIgnorePatterns?: string[];
  testRunner?: string;
  transform?: Record<string, string>;
  transformIgnorePatterns?: string[];
  watchPlugins?: string[];
}

const repoRoot = path.resolve(__dirname, "../..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "web-admin/package.json"), "utf8")
) as PackageJson;
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/build.yml"), "utf8");
const viteConfig = fs.readFileSync(path.join(repoRoot, "web-admin/vite.config.ts"), "utf8");
const jestConfigPath = path.join(repoRoot, "web-admin/jest.config.cjs");

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
    expect(packageJson.scripts.test).toBe(
      "cross-env BABEL_ENV=test NODE_ENV=test PUBLIC_URL= jest --watch"
    );
    expect(packageJson.scripts["test:ci"]).toBe(
      "cross-env BABEL_ENV=test NODE_ENV=test PUBLIC_URL= CI=true jest --watchAll=false --runInBand --silent"
    );
    expect(packageJson.scripts.test).not.toContain("react-scripts");
    expect(packageJson.scripts["test:ci"]).not.toContain("react-scripts");
    expect(packageJson.scripts["test:ci"]).not.toContain("--passWithNoTests");
  });

  test("owns the Jest transform, environment, discovery and coverage contract", () => {
    expect(fs.existsSync(jestConfigPath)).toBe(true);
    if (!fs.existsSync(jestConfigPath)) {
      return;
    }

    const jestConfig = require(jestConfigPath) as JestConfig;

    expect(jestConfig.roots).toEqual(["<rootDir>/src"]);
    expect(jestConfig.testMatch).toEqual([
      "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ]);
    expect(jestConfig.testPathIgnorePatterns).toBeUndefined();
    expect(jestConfig.testEnvironment).toBe("jest-environment-jsdom");
    expect(jestConfig.testEnvironmentOptions).toEqual({url: "http://localhost"});
    expect(jestConfig.setupFiles).toEqual(["react-app-polyfill/jsdom"]);
    expect(jestConfig.setupFilesAfterEnv).toEqual(["<rootDir>/src/setupTests.ts"]);
    expect(jestConfig.transform).toMatchObject({
      "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": "<rootDir>/config/jest/babelTransform.cjs",
    });
    expect(jestConfig.transformIgnorePatterns).toEqual([
      "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$",
      "^.+\\.module\\.(css|sass|scss|less)$",
    ]);
    expect(jestConfig.moduleNameMapper).toMatchObject({
      "^react-native$": "react-native-web",
      "^.+\\.module\\.(css|sass|scss|less)$": "identity-obj-proxy",
      "^.+\\.(css|sass|scss|less)$": "<rootDir>/config/jest/styleMock.cjs",
      "^.+\\.svg$": "<rootDir>/config/jest/svgMock.cjs",
    });
    expect(jestConfig.moduleFileExtensions).toEqual([
      "web.js",
      "js",
      "web.ts",
      "ts",
      "web.tsx",
      "tsx",
      "json",
      "web.jsx",
      "jsx",
      "node",
    ]);
    expect(jestConfig.resetMocks).toBe(true);
    expect(jestConfig.testRunner).toBe("jest-circus/runner");
    expect(jestConfig.collectCoverageFrom).toEqual([
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
    ]);
    expect(jestConfig.coverageDirectory).toBe("coverage");
    expect(jestConfig.coverageProvider).toBe("babel");
    expect(jestConfig.coverageReporters).toEqual(["json", "text", "lcov", "clover"]);
    expect(jestConfig.watchPlugins).toEqual([
      "jest-watch-typeahead/filename",
      "jest-watch-typeahead/testname",
    ]);

    const jestSupportDir = path.join(repoRoot, "web-admin/config/jest");
    const supportFiles = [
      "babelTransform.cjs",
      "fileMock.cjs",
      "styleMock.cjs",
      "svgMock.cjs",
    ];
    supportFiles.forEach((file) => {
      expect(fs.existsSync(path.join(jestSupportDir, file))).toBe(true);
    });

    expect(require(path.join(jestSupportDir, "styleMock.cjs"))).toEqual({});
    expect(require(path.join(jestSupportDir, "fileMock.cjs"))).toBe("test-file-stub");
    const svgMock = require(path.join(jestSupportDir, "svgMock.cjs")) as {
      default?: string;
      ReactComponent?: unknown;
    };
    expect(svgMock.default).toBe("test-file-stub.svg");
    expect(svgMock.ReactComponent).toBeDefined();
  });

  test("declares the standalone Jest dependencies and removes CRA ownership", () => {
    expect(packageJson.dependencies["react-scripts"]).toBeUndefined();
    expect(packageJson.devDependencies).toMatchObject({
      "@jest/globals": "27.5.1",
      "babel-jest": "27.5.1",
      "babel-preset-react-app": "10.0.1",
      "identity-obj-proxy": "3.0.0",
      "jest": "27.5.1",
      "jest-environment-jsdom": "27.5.1",
      "jest-watch-typeahead": "1.1.0",
    });
    expect(packageJson.eslintConfig).toBeUndefined();
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

  test("runs explicit Vite-era static, public script and Jest gates before the frontend build", () => {
    const frontendChecks = readJob("frontend-checks");
    const frontend = readJob("frontend");

    expect(frontendChecks).toContain("yarn typecheck");
    expect(frontendChecks).toContain("yarn typecheck:build-tooling");
    expect(frontendChecks).toContain("yarn public-scripts:check");
    expect(frontendChecks).toContain("yarn public-scripts:build");
    expect(frontendChecks).toContain("yarn public-scripts:smoke");
    expect(frontendChecks).toContain("yarn lint");
    expect(frontendChecks).toContain("yarn test:ci");
    expect(frontend).toContain("needs: [go-tests, frontend-checks]");
    expect(frontend).toContain("yarn run build");
  });

  test("runs the complete Playwright suite against the disposable CI database", () => {
    const e2e = readJob("e2e");

    expect(e2e).not.toBe("");
    expect(e2e).toContain("MYSQL_DATABASE: aicodex_admin");
    expect(e2e).toContain("node-version: 20.19.0");
    expect(e2e).toContain("yarn install --frozen-lockfile");
    expect(e2e).toContain("yarn playwright install --with-deps chromium");
    expect(e2e).toContain("yarn typecheck:e2e");
    expect(e2e).toContain("AICODEX_ADMIN_E2E_DISPOSABLE_DB: \"1\"");
    expect(e2e).toContain("yarn test:e2e");
    expect(e2e).toContain("path: ./web-admin/output/playwright");
    expect(e2e).toContain("retention-days: 7");
    expect(e2e).not.toContain("cypress-io/github-action");
    expect(e2e).not.toContain("cypress-screenshots");
    expect(e2e).not.toContain("cypress-videos");
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
