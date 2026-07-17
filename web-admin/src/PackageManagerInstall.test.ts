import {afterEach, expect, jest, test} from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";

const installerPath = path.resolve(__dirname, "../scripts/install-with-retry.cjs");
const webAdminRoot = path.resolve(__dirname, "..");

interface VerificationSummary {
  directExpected: number;
  directVerified: number;
  resolutionVerified: number;
  criticalEntriesVerified: number;
}

interface InstallerModule {
  MAX_ATTEMPTS: number;
  assertBunInvocation(options: {npmExecPath?: string; userAgent?: string}): void;
  assertPlatformCachePolicy(options: {platform: NodeJS.Platform; env: NodeJS.ProcessEnv}): void;
  ensureHuskyBunHook(options: {cwd: string; hooksDir?: string}): {updated: boolean};
  getBunVersion(options: {cwd: string; platform?: NodeJS.Platform}): string;
  installArgsForPlatform(platform: NodeJS.Platform): string[];
  runInstallWithRetry(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  verifyInstalledTree(options: {cwd: string; platform: NodeJS.Platform}): VerificationSummary;
  runProcess(
    command: string,
    args: string[],
    options: Record<string, unknown>
  ): Promise<{exitCode: number}>;
}

const tempRoots: string[] = [];

function loadInstaller(): InstallerModule {
  return require(installerPath) as InstallerModule;
}

function createTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aicodex-bun-install-"));
  tempRoots.push(root);
  return root;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeInstalledPackage(root: string, name: string, version: string): void {
  const packageRoot = path.join(root, "node_modules", ...name.split("/"));
  writeJson(path.join(packageRoot, "package.json"), {name, version, main: "index.js"});
  fs.writeFileSync(path.join(packageRoot, "index.js"), "module.exports = {};\n", "utf8");
}

function writeCli(root: string, name: string, platform: NodeJS.Platform): void {
  const extension = platform === "win32" ? ".exe" : "";
  const cliPath = path.join(root, "node_modules", ".bin", `${name}${extension}`);
  fs.mkdirSync(path.dirname(cliPath), {recursive: true});
  fs.writeFileSync(cliPath, "fixture\n", "utf8");
}

function createCompleteFixture(platform: NodeJS.Platform): string {
  const root = createTempRoot();
  const dependencies = {
    "@scope/direct": "1.0.0",
    "@playwright/test": "1.61.1",
    jest: "27.5.1",
    react: "18.2.0",
    "react-dom": "18.2.0",
    vite: "8.1.4",
  };
  const devDependencies = {playwright: "1.61.1", "playwright-core": "1.61.1"};
  writeJson(path.join(root, "package.json"), {
    packageManager: "bun@1.3.14",
    dependencies,
    devDependencies,
    resolutions: {"rc-virtual-list": "3.18.2"},
  });
  fs.writeFileSync(path.join(root, "bun.lock"), "fixture-lock\n", "utf8");

  Object.entries({...dependencies, ...devDependencies}).forEach(([name, version]) => {
    writeInstalledPackage(root, name, version);
  });
  writeInstalledPackage(root, "rc-virtual-list", "3.18.2");
  ["jest", "vite", "playwright"].forEach(name => writeCli(root, name, platform));
  return root;
}

function createOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    stdoutWriter: {write: (chunk: unknown) => stdout.push(String(chunk))},
    stderrWriter: {write: (chunk: unknown) => stderr.push(String(chunk))},
  };
}

afterEach(() => {
  tempRoots.splice(0).forEach(root => fs.rmSync(root, {recursive: true, force: true}));
});

test("exports the bounded Bun install contract", () => {
  expect(fs.existsSync(installerPath)).toBe(true);

  if (!fs.existsSync(installerPath)) {
    return;
  }

  const installer = require(installerPath) as Record<string, unknown>;
  expect(installer.MAX_ATTEMPTS).toBe(5);
  expect(installer.assertPlatformCachePolicy).toEqual(expect.any(Function));
  expect(installer.installArgsForPlatform).toEqual(expect.any(Function));
  expect(installer.runInstallWithRetry).toEqual(expect.any(Function));
  expect(installer.verifyInstalledTree).toEqual(expect.any(Function));
  expect(installer.runProcess).toEqual(expect.any(Function));
});

test("rejects a Bun binary that does not match the packageManager pin before installing", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const runInstall = jest.fn();

  await expect(
    installer.runInstallWithRetry({
      cwd: root,
      getBunVersion: () => "1.3.13",
      runInstall,
    })
  ).rejects.toThrow("expected Bun 1.3.14, received 1.3.13");
  expect(runInstall).not.toHaveBeenCalled();
});

test("selects ordinary install on Windows and frozen install on Linux", () => {
  const installer = loadInstaller();

  expect(installer.installArgsForPlatform("win32")).toEqual(["install"]);
  expect(installer.installArgsForPlatform("linux")).toEqual(["install", "--frozen-lockfile"]);
});

test("rejects a custom Windows cache before spawning the first install", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const customCache = path.join(createTempRoot(), "custom-cache");
  const sentinel = path.join(customCache, "keep.txt");
  fs.mkdirSync(customCache, {recursive: true});
  fs.writeFileSync(sentinel, "user evidence\n", "utf8");
  const runInstall = jest.fn();

  await expect(
    installer.runInstallWithRetry({
      cwd: root,
      platform: "win32",
      env: {...process.env, BUN_INSTALL_CACHE_DIR: customCache},
      getBunVersion: () => "1.3.14",
      runInstall,
    })
  ).rejects.toThrow("unset BUN_INSTALL_CACHE_DIR to use the Windows persistent default cache");
  expect(runInstall).not.toHaveBeenCalled();
  expect(fs.readFileSync(sentinel, "utf8")).toBe("user evidence\n");
});

test("keeps the same workspace and succeeds after the first Windows install failure", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const calls: Array<{attempt: number; cwd: string}> = [];
  const delays: number[] = [];
  const output = createOutput();

  const result = await installer.runInstallWithRetry({
    cwd: root,
    getBunVersion: () => "1.3.14",
    runInstall: ({attempt, cwd}: {attempt: number; cwd: string}) => {
      calls.push({attempt, cwd});
      return {exitCode: attempt === 1 ? 1 : 0};
    },
    verifyInstalledTree: () => ({
      directExpected: 8,
      directVerified: 8,
      resolutionVerified: 1,
      criticalEntriesVerified: 8,
    }),
    sleep: (milliseconds: number) => delays.push(milliseconds),
    stdout: output.stdoutWriter,
    stderr: output.stderrWriter,
  });

  expect(calls).toEqual([
    {attempt: 1, cwd: root},
    {attempt: 2, cwd: root},
  ]);
  expect(delays).toEqual([5000]);
  expect(result).toMatchObject({attempts: 2});
  expect(output.stdout.join("")).toContain("attempt 1/5");
  expect(output.stdout.join("")).toContain("attempt 2/5");
  expect(output.stdout.join("")).toContain("bun install");
  expect(output.stdout.join("")).not.toContain("--frozen-lockfile");
  expect(output.stderr.join("")).toContain("attempt 1 failed with exit code 1");
});

test("fails closed after exactly five unsuccessful platform installs", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const attempts: number[] = [];
  const delays: number[] = [];

  await expect(
    installer.runInstallWithRetry({
      cwd: root,
      getBunVersion: () => "1.3.14",
      runInstall: ({attempt}: {attempt: number}) => {
        attempts.push(attempt);
        return {exitCode: 1};
      },
      sleep: (milliseconds: number) => delays.push(milliseconds),
      stdout: createOutput().stdoutWriter,
      stderr: createOutput().stderrWriter,
    })
  ).rejects.toThrow("failed after 5 attempts");

  expect(attempts).toEqual([1, 2, 3, 4, 5]);
  expect(delays).toEqual([5000, 10000, 15000, 20000]);
});

test("streams child stdout and stderr without suppressing the failure", async() => {
  const installer = loadInstaller();
  const root = createTempRoot();
  const output = createOutput();

  const result = await installer.runProcess(
    process.execPath,
    ["-e", "process.stdout.write('visible-out'); process.stderr.write('visible-error'); process.exit(7)"],
    {cwd: root, stdout: output.stdoutWriter, stderr: output.stderrWriter}
  );

  expect(result.exitCode).toBe(7);
  expect(output.stdout.join("")).toContain("visible-out");
  expect(output.stderr.join("")).toContain("visible-error");
});

test("reports a child process launch failure through stderr", async() => {
  const installer = loadInstaller();
  const output = createOutput();

  const result = await installer.runProcess("definitely-missing-aicodex-binary", [], {
    cwd: createTempRoot(),
    stdout: output.stdoutWriter,
    stderr: output.stderrWriter,
  });

  expect(result.exitCode).toBe(1);
  expect(output.stderr.join("")).toContain("[bun-install] process error:");
});

test("reads the pinned Bun binary version from the current toolchain", () => {
  const installer = loadInstaller();
  expect(installer.getBunVersion({cwd: createTempRoot()})).toBe("1.3.14");
});

test.each(["win32", "linux"] as const)(
  "verifies scoped manifests, resolutions, critical entries and %s CLI paths",
  platform => {
    const installer = loadInstaller();
    const root = createCompleteFixture(platform);

    expect(installer.verifyInstalledTree({cwd: root, platform})).toEqual({
      directExpected: 8,
      directVerified: 8,
      resolutionVerified: 1,
      criticalEntriesVerified: 8,
    });
  }
);

test("rejects a missing direct dependency manifest", () => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  fs.rmSync(path.join(root, "node_modules", "@scope", "direct", "package.json"));

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "missing direct dependency manifests: @scope/direct"
  );
});

test("rejects malformed package metadata without echoing its contents", () => {
  const installer = loadInstaller();
  const root = createTempRoot();
  fs.writeFileSync(path.join(root, "package.json"), "{not-json", "utf8");

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "unable to read package.json"
  );
});

test("rejects a direct dependency manifest with the wrong package name", () => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  writeJson(path.join(root, "node_modules", "react", "package.json"), {
    name: "not-react",
    version: "18.2.0",
    main: "index.js",
  });

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "direct dependency manifest name mismatch: expected react, received not-react"
  );
});

test("rejects an installed resolution version mismatch", () => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  writeInstalledPackage(root, "rc-virtual-list", "3.18.1");

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "resolution mismatch for rc-virtual-list: expected 3.18.2, received 3.18.1"
  );
});

test("rejects a missing resolution manifest", () => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  fs.rmSync(path.join(root, "node_modules", "rc-virtual-list", "package.json"));

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "missing resolution manifest: rc-virtual-list"
  );
});

test("rejects a missing critical package entry even when its manifest exists", () => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  fs.rmSync(path.join(root, "node_modules", "playwright-core", "index.js"));

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "missing critical package entries: playwright-core"
  );
});

test("rejects a missing critical CLI entry", () => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  fs.rmSync(path.join(root, "node_modules", ".bin", "playwright.exe"));

  expect(() => installer.verifyInstalledTree({cwd: root, platform: "win32"})).toThrow(
    "missing critical CLI entries: playwright"
  );
});

test("aborts immediately when an install attempt changes bun.lock", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const verifyInstalledTree = jest.fn();
  const runInstall = jest.fn(() => {
    fs.appendFileSync(path.join(root, "bun.lock"), "drift\n", "utf8");
    return {exitCode: 0};
  });

  await expect(
    installer.runInstallWithRetry({
      cwd: root,
      getBunVersion: () => "1.3.14",
      runInstall,
      verifyInstalledTree,
      stdout: createOutput().stdoutWriter,
      stderr: createOutput().stderrWriter,
    })
  ).rejects.toThrow("bun.lock changed during install attempt 1");

  expect(runInstall).toHaveBeenCalledTimes(1);
  expect(verifyInstalledTree).not.toHaveBeenCalled();
});

test("retries a zero-exit install whose dependency tree is still incomplete", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const runInstall = jest.fn(() => ({exitCode: 0}));
  const verifyInstalledTree = jest.fn(() => {
    throw new Error("missing direct dependency manifests: react");
  });

  await expect(
    installer.runInstallWithRetry({
      cwd: root,
      getBunVersion: () => "1.3.14",
      runInstall,
      verifyInstalledTree,
      sleep: () => undefined,
      stdout: createOutput().stdoutWriter,
      stderr: createOutput().stderrWriter,
    })
  ).rejects.toThrow("failed after 5 attempts");

  expect(runInstall).toHaveBeenCalledTimes(5);
  expect(verifyInstalledTree).toHaveBeenCalledTimes(5);
});

test("requires a Bun packageManager pin and a bun.lock before retrying", async() => {
  const installer = loadInstaller();
  const root = createCompleteFixture("win32");
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  packageJson.packageManager = "yarn@1.22.22";
  writeJson(path.join(root, "package.json"), packageJson);

  await expect(
    installer.runInstallWithRetry({cwd: root, getBunVersion: () => "1.3.14"})
  ).rejects.toThrow("packageManager must pin Bun with the form bun@<version>");

  packageJson.packageManager = "bun@1.3.14";
  writeJson(path.join(root, "package.json"), packageJson);
  fs.rmSync(path.join(root, "bun.lock"));
  await expect(
    installer.runInstallWithRetry({cwd: root, getBunVersion: () => "1.3.14"})
  ).rejects.toThrow("bun.lock is required for managed install");
});

test("treats a thrown install process error as a visible failed attempt", async() => {
  const installer = loadInstaller();
  const output = createOutput();
  const runInstall = jest.fn(() => {
    throw new Error("spawn blocked");
  });

  await expect(
    installer.runInstallWithRetry({
      cwd: createCompleteFixture("win32"),
      getBunVersion: () => "1.3.14",
      runInstall,
      sleep: () => undefined,
      stdout: output.stdoutWriter,
      stderr: output.stderrWriter,
    })
  ).rejects.toThrow("failed after 5 attempts");

  expect(runInstall).toHaveBeenCalledTimes(5);
  expect(output.stderr.join("")).toContain("attempt 1 process failure: spawn blocked");
});

test("accepts Bun lifecycle invocation and rejects Yarn or npm", () => {
  const installer = loadInstaller();

  expect(() => installer.assertBunInvocation({npmExecPath: "C:\\tools\\bun.exe"})).not.toThrow();
  expect(() => installer.assertBunInvocation({userAgent: "bun/1.3.14"})).not.toThrow();
  expect(() => installer.assertBunInvocation({npmExecPath: "C:\\tools\\yarn.cmd"})).toThrow(
    "Use Bun 1.3.14 for installing web-admin dependencies"
  );
});

test("uses Bun 1.3.14 and bun.lock as the only tracked package manager truth", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(webAdminRoot, "package.json"), "utf8")
  );

  expect(packageJson.packageManager).toBe("bun@1.3.14");
  expect(packageJson.trustedDependencies).toEqual(["husky"]);
  expect(packageJson.scripts["deps:install"]).toBe("node scripts/install-with-retry.cjs");
  expect(packageJson.scripts.preinstall).toBe("node scripts/install-with-retry.cjs --guard");
  expect(packageJson.scripts.prebuild).toBe("bun run public-scripts:build");
  expect(packageJson.scripts.lint).toContain("--ignore-pattern \"**/*.test.*\"");
  expect(packageJson.scripts["test:ci"]).toContain("jest");
  expect(packageJson.scripts["test:ci"]).not.toContain("bun test");
  expect(fs.existsSync(path.join(webAdminRoot, "bun.lock"))).toBe(true);
  expect(fs.existsSync(path.join(webAdminRoot, "yarn.lock"))).toBe(false);
});

test("normalizes a Husky v4 generated hook to Bun without an install fallback", () => {
  const installer = loadInstaller();
  const root = createTempRoot();
  const hooksDir = path.join(root, ".git", "hooks");
  fs.mkdirSync(hooksDir, {recursive: true});
  fs.writeFileSync(
    path.join(hooksDir, "husky.sh"),
    "case $packageManager in\n  \"yarn\") run_command yarn run --silent;;\n  *) echo \"Unknown package manager: $packageManager\"; exit 0;;\nesac\n",
    "utf8"
  );
  fs.writeFileSync(path.join(hooksDir, "husky.local.sh"), "packageManager=yarn\ncd \"web-admin/\"\n", "utf8");

  expect(installer.ensureHuskyBunHook({cwd: root, hooksDir})).toEqual({updated: true});
  expect(fs.readFileSync(path.join(hooksDir, "husky.sh"), "utf8")).toContain(
    "\"bun\") run_command bun x --no-install;;"
  );
  expect(fs.readFileSync(path.join(hooksDir, "husky.local.sh"), "utf8")).toContain(
    "packageManager=bun"
  );
});

test("skips Husky normalization when the environment has no Git hooks", () => {
  const installer = loadInstaller();
  expect(installer.ensureHuskyBunHook({cwd: createTempRoot()})).toEqual({updated: false});
});

test("fails closed when an existing Husky hook has an unknown launcher structure", () => {
  const installer = loadInstaller();
  const root = createTempRoot();
  const hooksDir = path.join(root, ".git", "hooks");
  fs.mkdirSync(hooksDir, {recursive: true});
  fs.writeFileSync(path.join(hooksDir, "husky.sh"), "unknown-hook-layout\n", "utf8");
  fs.writeFileSync(path.join(hooksDir, "husky.local.sh"), "packageManager=bun\n", "utf8");

  expect(() => installer.ensureHuskyBunHook({cwd: root, hooksDir})).toThrow(
    "unable to add Bun launcher to existing Husky hook"
  );
});
