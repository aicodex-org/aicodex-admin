"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {spawn, spawnSync} = require("child_process");

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;
const CRITICAL_PACKAGES = [
  "react",
  "react-dom",
  "jest",
  "vite",
  "@playwright/test",
  "playwright",
  "playwright-core",
  "rc-virtual-list",
];
const CRITICAL_CLIS = ["jest", "vite", "playwright"];

function writeLine(stream, message) {
  stream.write(`${message}\n`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`unable to read ${label}: ${error.message}`);
  }
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function packagePath(root, packageName) {
  return path.join(root, "node_modules", ...packageName.split("/"));
}

function expectedBunVersion(packageJson) {
  const match = /^bun@(.+)$/.exec(packageJson.packageManager || "");
  if (!match) {
    throw new Error("packageManager must pin Bun with the form bun@<version>");
  }
  return match[1];
}

function bunExecutable(platform) {
  return platform === "win32" ? "bun.exe" : "bun";
}

function installArgsForPlatform(platform) {
  return platform === "win32" ? ["install"] : ["install", "--frozen-lockfile"];
}

function assertPlatformCachePolicy({platform, env = process.env}) {
  if (platform === "win32" && String(env.BUN_INSTALL_CACHE_DIR || "").trim() !== "") {
    throw new Error("unset BUN_INSTALL_CACHE_DIR to use the Windows persistent default cache");
  }
}

function getBunVersion({cwd, platform = process.platform}) {
  const result = spawnSync(bunExecutable(platform), ["--version"], {
    cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const reason = result.error ? result.error.message : `exit code ${result.status}`;
    throw new Error(`unable to execute Bun: ${reason}`);
  }
  return result.stdout.trim();
}

/** 保留子进程完整输出，避免CI、Docker或本地重试摘要隐藏真实安装错误。 */
function runProcess(
  command,
  args,
  {
    cwd,
    env = process.env,
    stdout = process.stdout,
    stderr = process.stderr,
    spawnImpl = spawn,
  } = {}
) {
  return new Promise(resolve => {
    let settled = false;
    const child = spawnImpl(command, args, {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout?.on("data", chunk => stdout.write(chunk));
    child.stderr?.on("data", chunk => stderr.write(chunk));
    child.once("error", error => {
      if (settled) {
        return;
      }
      settled = true;
      writeLine(stderr, `[bun-install] process error: ${error.message}`);
      resolve({exitCode: 1, error});
    });
    child.once("close", code => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({exitCode: Number.isInteger(code) ? code : 1});
    });
  });
}

function cliCandidates(cliName, platform) {
  if (platform === "win32") {
    return [`${cliName}.exe`, `${cliName}.bunx`];
  }
  return [cliName];
}

/** 将依赖物化纳入成功条件，拦截Bun退出后仍随机缺失manifest或CLI的残缺tree。 */
function verifyInstalledTree({cwd, platform = process.platform}) {
  const packageJson = readJson(path.join(cwd, "package.json"), "package.json");
  const directNames = [...new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ])].sort();

  const missingDirect = [];
  for (const name of directNames) {
    const manifestPath = path.join(packagePath(cwd, name), "package.json");
    if (!fs.existsSync(manifestPath)) {
      missingDirect.push(name);
      continue;
    }
    const manifest = readJson(manifestPath, `${name} manifest`);
    if (manifest.name !== name) {
      throw new Error(`direct dependency manifest name mismatch: expected ${name}, received ${manifest.name || "<missing>"}`);
    }
  }
  if (missingDirect.length > 0) {
    throw new Error(`missing direct dependency manifests: ${missingDirect.join(", ")}`);
  }

  const resolutions = Object.entries(packageJson.resolutions || {});
  for (const [name, expectedVersion] of resolutions) {
    const manifestPath = path.join(packagePath(cwd, name), "package.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`missing resolution manifest: ${name}`);
    }
    const manifest = readJson(manifestPath, `${name} resolution manifest`);
    if (manifest.version !== expectedVersion) {
      throw new Error(`resolution mismatch for ${name}: expected ${expectedVersion}, received ${manifest.version || "<missing>"}`);
    }
  }

  const missingCriticalEntries = [];
  for (const name of CRITICAL_PACKAGES) {
    try {
      require.resolve(name, {paths: [cwd]});
    } catch {
      missingCriticalEntries.push(name);
    }
  }
  if (missingCriticalEntries.length > 0) {
    throw new Error(`missing critical package entries: ${missingCriticalEntries.join(", ")}`);
  }

  const binRoot = path.join(cwd, "node_modules", ".bin");
  const missingCriticalClis = CRITICAL_CLIS.filter(name =>
    cliCandidates(name, platform).every(candidate => !fs.existsSync(path.join(binRoot, candidate)))
  );
  if (missingCriticalClis.length > 0) {
    throw new Error(`missing critical CLI entries: ${missingCriticalClis.join(", ")}`);
  }

  return {
    directExpected: directNames.length,
    directVerified: directNames.length,
    resolutionVerified: resolutions.length,
    criticalEntriesVerified: CRITICAL_PACKAGES.length,
  };
}

function defaultSleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function resolveGitHooksDir(cwd) {
  const result = spawnSync("git", ["-C", cwd, "rev-parse", "--git-path", "hooks"], {
    cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const resolved = result.stdout.trim();
  return path.isAbsolute(resolved) ? resolved : path.resolve(cwd, resolved);
}

/** Husky v4不识别Bun；这里只规范化生成的Git hook，tracked package仍保持Bun单一真值。 */
function ensureHuskyBunHook({cwd, hooksDir = resolveGitHooksDir(cwd)}) {
  if (!hooksDir || !fs.existsSync(hooksDir)) {
    return {updated: false};
  }

  const hookPath = path.join(hooksDir, "husky.sh");
  const localPath = path.join(hooksDir, "husky.local.sh");
  if (!fs.existsSync(hookPath) && !fs.existsSync(localPath)) {
    return {updated: false};
  }
  if (!fs.existsSync(hookPath) || !fs.existsSync(localPath)) {
    throw new Error("incomplete existing Husky hook state");
  }

  let hook = fs.readFileSync(hookPath, "utf8");
  let local = fs.readFileSync(localPath, "utf8");
  let updated = false;
  const bunLauncher = '  "bun") run_command bun x --no-install;;';
  if (!hook.includes(bunLauncher)) {
    const yarnLauncher = '  "yarn") run_command yarn run --silent;;';
    if (!hook.includes(yarnLauncher)) {
      throw new Error("unable to add Bun launcher to existing Husky hook");
    }
    hook = hook.replace(yarnLauncher, `${yarnLauncher}\n${bunLauncher}`);
    updated = true;
  }

  if (!/^packageManager=/m.test(local)) {
    throw new Error("unable to set Bun package manager in existing Husky hook");
  }
  if (!/^packageManager=bun$/m.test(local)) {
    local = local.replace(/^packageManager=.*$/m, "packageManager=bun");
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(hookPath, hook, "utf8");
    fs.writeFileSync(localPath, local, "utf8");
  }
  return {updated};
}

/** 在同一workspace和固定lock内有界重试；lock漂移不可恢复，命令失败或残缺tree消耗一次attempt。 */
async function runInstallWithRetry(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const packageJson = readJson(path.join(cwd, "package.json"), "package.json");
  assertPlatformCachePolicy({platform, env});
  const expectedVersion = expectedBunVersion(packageJson);
  const readVersion = options.getBunVersion || getBunVersion;
  const actualVersion = await readVersion({cwd, platform});
  if (actualVersion !== expectedVersion) {
    throw new Error(`expected Bun ${expectedVersion}, received ${actualVersion}`);
  }

  const lockPath = path.join(cwd, "bun.lock");
  if (!fs.existsSync(lockPath)) {
    throw new Error("bun.lock is required for managed install");
  }
  const originalLockHash = hashFile(lockPath);
  const sleep = options.sleep || defaultSleep;
  const verify = options.verifyInstalledTree || verifyInstalledTree;
  const normalizeHuskyHook = options.ensureHuskyBunHook || ensureHuskyBunHook;
  const installArgs = installArgsForPlatform(platform);
  const runInstall = options.runInstall || (context => runProcess(
    bunExecutable(platform),
    installArgs,
    context
  ));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    writeLine(stdout, `[bun-install] attempt ${attempt}/${MAX_ATTEMPTS}: bun ${installArgs.join(" ")}`);
    let result;
    try {
      result = await runInstall({attempt, cwd, platform, stdout, stderr, env, installArgs: [...installArgs]});
    } catch (error) {
      writeLine(stderr, `[bun-install] attempt ${attempt} process failure: ${error.message}`);
      result = {exitCode: 1};
    }

    if (hashFile(lockPath) !== originalLockHash) {
      throw new Error(`bun.lock changed during install attempt ${attempt}`);
    }

    if (result.exitCode === 0) {
      try {
        const verification = verify({cwd, platform});
        writeLine(
          stdout,
          `[bun-install] dependency tree complete: direct ${verification.directVerified}/${verification.directExpected}, resolutions ${verification.resolutionVerified}, critical ${verification.criticalEntriesVerified}`
        );
        const huskyHook = normalizeHuskyHook({cwd});
        if (huskyHook.updated) {
          writeLine(stdout, "[bun-install] normalized Husky v4 hook for Bun");
        }
        return {attempts: attempt, lockHash: originalLockHash, verification, huskyHook};
      } catch (error) {
        writeLine(stderr, `[bun-install] attempt ${attempt} integrity check failed: ${error.message}`);
      }
    } else {
      writeLine(stderr, `[bun-install] attempt ${attempt} failed with exit code ${result.exitCode}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      const delay = attempt * RETRY_DELAY_MS;
      writeLine(stderr, `[bun-install] retrying in ${delay / 1000}s within the same workspace`);
      await sleep(delay);
    }
  }

  throw new Error(`bun install failed after ${MAX_ATTEMPTS} attempts`);
}

function assertBunInvocation({npmExecPath = process.env.npm_execpath, userAgent = process.env.npm_config_user_agent} = {}) {
  const executableName = npmExecPath ? path.basename(npmExecPath).toLowerCase() : "";
  const executableIsBun = executableName === "bun" || executableName === "bun.exe";
  const invocationIsBun = npmExecPath ? executableIsBun : String(userAgent || "").startsWith("bun/");
  if (!invocationIsBun) {
    throw new Error("Use Bun 1.3.14 for installing web-admin dependencies");
  }
}

if (require.main === module) {
  if (process.argv.includes("--guard")) {
    try {
      assertBunInvocation();
    } catch (error) {
      writeLine(process.stderr, `[bun-install] ${error.message}`);
      process.exitCode = 1;
    }
  } else {
    runInstallWithRetry().catch(error => {
      writeLine(process.stderr, `[bun-install] ${error.message}`);
      process.exitCode = 1;
    });
  }
}

module.exports = {
  MAX_ATTEMPTS,
  assertBunInvocation,
  assertPlatformCachePolicy,
  ensureHuskyBunHook,
  getBunVersion,
  hashFile,
  installArgsForPlatform,
  runInstallWithRetry,
  verifyInstalledTree,
  runProcess,
};
