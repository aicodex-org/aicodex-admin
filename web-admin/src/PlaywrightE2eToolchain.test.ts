/* eslint-env jest */
import {expect} from "@jest/globals";
import fs from "fs";
import path from "path";

interface PackageJson {
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

interface RuntimeHelper {
  assertDisposableE2EEnvironment?: (value?: string) => void;
  resolveE2EBaseURL?: (value?: string) => string;
}

const repoRoot = path.resolve(__dirname, "../..");
const webAdminRoot = path.join(repoRoot, "web-admin");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(webAdminRoot, "package.json"), "utf8")
) as PackageJson;
const playwrightConfigPath = path.join(webAdminRoot, "playwright.config.ts");
const playwrightRoot = path.join(webAdminRoot, "playwright");
const runtimeHelperPath = path.join(playwrightRoot, "support/runtime.ts");

const readRuntimeHelper = (): RuntimeHelper | undefined => {
  if (!fs.existsSync(runtimeHelperPath)) {
    return undefined;
  }

  return require(runtimeHelperPath) as RuntimeHelper;
};

const listSpecFiles = (): string[] => {
  const e2eDir = path.join(playwrightRoot, "e2e");
  if (!fs.existsSync(e2eDir)) {
    return [];
  }

  return fs.readdirSync(e2eDir)
    .filter((file) => file.endsWith(".spec.ts"))
    .sort();
};

describe("web-admin Playwright E2E toolchain", () => {
  test("declares Playwright scripts and removes Cypress dependency ownership", () => {
    expect(packageJson.scripts["test:e2e"]).toBe("playwright test");
    expect(packageJson.scripts["test:e2e:list"]).toBe("playwright test --list");
    expect(packageJson.scripts["typecheck:e2e"]).toBe(
      "tsc -p playwright/tsconfig.json --noEmit"
    );
    expect(packageJson.devDependencies["@playwright/test"]).toBeDefined();
    expect(packageJson.devDependencies.cypress).toBeUndefined();
  });

  test("uses one typed config for loopback 7002 and disposable diagnostics", () => {
    expect(fs.existsSync(playwrightConfigPath)).toBe(true);
    if (!fs.existsSync(playwrightConfigPath)) {
      return;
    }

    const config = fs.readFileSync(playwrightConfigPath, "utf8");
    expect(config).toContain("resolveE2EBaseURL");
    expect(config).toContain("PORT: \"7002\"");
    expect(config).toContain("AICODEX_ADMIN_DEV_PROXY_TARGET: \"http://127.0.0.1:8000\"");
    expect(config).toContain("forbidOnly: true");
    expect(config).toContain("fullyParallel: false");
    expect(config).toContain("workers: 1");
    expect(config).toContain("retries: process.env.CI ? 2 : 0");
    expect(config).toContain("reuseExistingServer: false");
    expect(config).not.toContain("reuseExistingServer: !process.env.CI");
    expect(config).toContain("name: \"chromium\"");
    expect(config).toContain("output/playwright/test-results");
    expect(config).toContain("output/playwright/report");
    expect(config).toContain("trace: \"retain-on-failure\"");
    expect(config).toContain("screenshot: \"only-on-failure\"");
    expect(config).not.toContain("video:");
  });

  test("resolves only loopback port 7002 base URLs", () => {
    const helper = readRuntimeHelper();
    const resolveE2EBaseURL = helper?.resolveE2EBaseURL;
    expect(resolveE2EBaseURL).toBeDefined();
    if (!resolveE2EBaseURL) {
      return;
    }

    expect(resolveE2EBaseURL()).toBe("http://127.0.0.1:7002");
    expect(resolveE2EBaseURL("http://localhost:7002")).toBe(
      "http://localhost:7002"
    );
    expect(() => resolveE2EBaseURL("not a URL")).toThrow(
      "valid loopback origin"
    );
    expect(() => resolveE2EBaseURL("http://127.0.0.1:7001")).toThrow(
      "port 7002"
    );
    expect(() => resolveE2EBaseURL("https://127.0.0.1:7002")).toThrow(
      "http"
    );
    expect(() => resolveE2EBaseURL("http://192.0.2.10:7002")).toThrow(
      "loopback"
    );
    expect(() => resolveE2EBaseURL("http://user:pass@localhost:7002")).toThrow(
      "credentials"
    );
    expect(() => resolveE2EBaseURL("http://localhost:7002/admin")).toThrow(
      "origin"
    );
  });

  test("requires the explicit disposable database confirmation", () => {
    const helper = readRuntimeHelper();
    const assertDisposableE2EEnvironment = helper?.assertDisposableE2EEnvironment;
    expect(assertDisposableE2EEnvironment).toBeDefined();
    if (!assertDisposableE2EEnvironment) {
      return;
    }

    expect(() => assertDisposableE2EEnvironment("1")).not.toThrow();
    expect(() => assertDisposableE2EEnvironment()).toThrow(
      "AICODEX_ADMIN_E2E_DISPOSABLE_DB=1"
    );
    expect(() => assertDisposableE2EEnvironment("true")).toThrow(
      "AICODEX_ADMIN_E2E_DISPOSABLE_DB=1"
    );
  });

  test("preserves the 19 spec and 22 test migration map without skip or only", () => {
    const specFiles = listSpecFiles();
    expect(specFiles).toEqual([
      "adapter.spec.ts",
      "application.spec.ts",
      "certs.spec.ts",
      "login.spec.ts",
      "models.spec.ts",
      "orgnazition.spec.ts",
      "payments.spec.ts",
      "permissions.spec.ts",
      "products.spec.ts",
      "providers.spec.ts",
      "records.spec.ts",
      "resource.spec.ts",
      "role.spec.ts",
      "sessions.spec.ts",
      "syncers.spec.ts",
      "sysinfo.spec.ts",
      "tokens.spec.ts",
      "user.spec.ts",
      "webhooks.spec.ts",
    ]);

    const source = specFiles
      .map((file) => fs.readFileSync(path.join(playwrightRoot, "e2e", file), "utf8"))
      .join("\n");
    expect(source.match(/\btest\(\s*["']/g) ?? []).toHaveLength(22);
    expect(source).not.toMatch(/\btest\.(skip|only)\b/);
    expect(source).not.toMatch(/\btest\.describe\.(skip|only)\b/);
  });

  test("removes executable Cypress assets while retaining Bun as package truth", () => {
    expect(fs.existsSync(path.join(webAdminRoot, "cypress.config.ts"))).toBe(false);
    expect(fs.existsSync(path.join(webAdminRoot, "cypress"))).toBe(false);
    expect(fs.existsSync(path.join(webAdminRoot, "bun.lock"))).toBe(true);
    expect(fs.existsSync(path.join(webAdminRoot, "bun.lockb"))).toBe(false);
    expect(fs.existsSync(path.join(webAdminRoot, "yarn.lock"))).toBe(false);

    if (!fs.existsSync(path.join(webAdminRoot, "bun.lock"))) {
      return;
    }

    const lockfile = fs.readFileSync(path.join(webAdminRoot, "bun.lock"), "utf8");
    expect(lockfile).not.toMatch(/^cypress@/m);
    expect(lockfile).not.toContain("\"cypress\"");
    expect(lockfile).not.toContain("\"@cypress/");
    expect(lockfile).not.toContain("\"bluebird\"");
  });
});
