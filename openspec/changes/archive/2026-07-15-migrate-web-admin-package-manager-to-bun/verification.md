# 验证记录

## 决策摘要

- 结论：**NO-GO**。
- 原因：Bun `1.3.14` 在两个独立隔离目录中均无法完成 `bun install --frozen-lockfile` 真实 lifecycle install；两次均出现数百个深层 `node_modules` `ENOENT`，最终由 Cypress postinstall 因传递模块缺失退出 1。
- 处置：停止迁移，保留 `web-admin/package.json` 的 Yarn guard、唯一 `web-admin/yarn.lock` 以及所有 CI/Docker/Makefile/local-dev/docs Yarn 调用方；不提交 Bun lock，不进入 TDD 实施。
- 阈值：由于 Bun 没有任何有效冷安装样本，无法计算 20% 收益中位数，也不存在等价的 Jest/Vite build 输入；按 proposal 的“兼容门禁失败或有效样本不足即 NO-GO”执行。

## 基线与环境

- Benchmark source：`c0064c6da0feb21bfc944c0f48f2aac38f747ecb`。
- RC 最新 base：`origin/hfl-test-base@ff5d6ae8c8286c33e9c9720b59d0eca9819098dd`。
- 两个 base 之间只新增 Admin Go lifecycle/OpenSpec 归档文件；`web-admin`、前端 workflow、Dockerfile、Makefile 和 local-dev benchmark 输入无变化，因此安装失败证据可复用。
- 分支：`hfl-test/migrate-web-admin-package-manager-to-bun`。
- OS：Windows 11 Pro `10.0.26200`，NTFS 固定磁盘。
- CPU：Intel Core i5-10400，6 cores / 12 logical processors。
- Memory：31.8 GiB。

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | `v24.14.0` | 满足当前 `package.json` engines |
| npm | `11.7.0` | 仅记录环境，不作为候选 package manager |
| Yarn Classic | `1.22.22` | 当前单一真值 |
| Bun | `1.3.14` | 临时候选，未 pin 到仓库 |
| Docker | N/A | 本机未安装 Docker CLI；未声称真实 Docker build 通过 |

## 方法与噪声控制

- 每个样本只复制当前提交中 `git ls-files web-admin` 返回的 tracked 文件；不复用 workspace 的 ignored `node_modules`。
- 候选 Bun 修改只发生在系统临时隔离副本：允许 Bun 的临时 `preinstall`、将临时 `prebuild` 改为 Bun orchestration，并添加临时 `packageManager=bun@1.3.14`；tracked `package.json` 未修改。
- 每个安装样本使用独立 package-manager cache 和独立 workspace；Yarn control 还使用独立空 Cypress cache。
- 性能/安装命令严格串行，未与 subagent、Jest、build 或其它 benchmark 并行。
- registry 使用当前 ambient 配置，但验证记录不读取或输出 registry endpoint、credential、header、token、Cookie 或认证响应。
- Bun 在系统临时长路径失败后，又在同一磁盘的短路径根独立复测，以排除单纯 Windows path-length 噪声。

## 原始安装样本

### 脱敏命令模板

隔离副本通过 `git -c core.quotepath=false ls-files -- web-admin` 枚举 tracked 输入并复制到 `<isolated-root>/web-admin`。Bun 候选只在该副本中调整 install guard、`prebuild` 和 `packageManager`；不修改 workspace 文件。实际测量使用 `Get-Date` 包围 `Start-Process -Wait -PassThru`，并将 stdout/stderr 重定向到隔离日志；`seconds = ((Get-Date) - $started).TotalSeconds`，退出码来自 `ExitCode`。

```powershell
$env:CI = "true"
$env:CYPRESS_CACHE_FOLDER = "<empty-isolated-cypress-cache>"

$env:BUN_INSTALL_CACHE_DIR = "<empty-isolated-bun-lock-cache>"
bun install --lockfile-only

$env:BUN_INSTALL_CACHE_DIR = "<empty-isolated-bun-install-cache>"
bun install --frozen-lockfile
```

Yarn control 使用同一 tracked 输入、独立短路径 workspace、空 Yarn/Cypress cache 和原始 `package.json + yarn.lock`：

```powershell
$env:CI = "true"
$env:YARN_CACHE_FOLDER = "<empty-isolated-yarn-cache>"
$env:CYPRESS_CACHE_FOLDER = "<empty-isolated-cypress-cache>"
yarn install --frozen-lockfile --non-interactive
```

模板不包含 registry endpoint 或 credential；运行者应保留自己的安全 registry 配置，不把其值写入日志或验证文档。

| 样本 | 路径类别 | Lock 阶段 | Frozen lifecycle install | 结果摘要 |
|------|----------|-----------|--------------------------|----------|
| Bun-1 | 系统临时路径 | `10.721s`，exit 0 | `249.144s`，exit 1 | 715 个深层 ENOENT；Cypress 缺失 `execa`；postinstall 失败；Husky hook 未生成 |
| Bun-2 | 短路径 | `8.359s`，exit 0 | `238.828s`，exit 1 | 803 个深层 ENOENT；Cypress 缺失 `safer-buffer`；postinstall 失败；Husky hook 未生成 |
| Yarn-control | 短路径 | 使用 tracked frozen `yarn.lock` | `509.61s`，成功 | 空 Yarn/Cypress cache 下完成；Vite/Cypress manifest 存在；Cypress `12.15.0` cache 存在 |

两次 Bun 候选 text lock SHA-256 均为 `86771D8950ED0C4DD790C8271F0F2B97463DCC851433AAA8855FA8C1E61E8D4F`，说明解析输入稳定；失败模块不同但链接缺失类型一致。Yarn control 的 `yarn.lock` SHA-256 与 tracked 文件一致，均为 `A0CE7681D5754C792247DEBE433C7BD1370571DC2E7AEC3A9E9F7E45D7AC02D5`。

上述 Bun 安装均为无效失败样本，**不得**与 Yarn 单一成功 control 计算性能改善百分比。Yarn control 包含首次 Cypress binary 下载噪声，只证明基线可安装，不作为性能中位数。

## Benchmark 覆盖与停止点

| 项目 | 状态 | 证据层级 |
|------|------|----------|
| 冷安装 | 阻断失败 | Bun 两次独立 frozen lifecycle install 均失败；无有效样本/中位数 |
| 缓存安装 | 未执行 | 冷安装 compatibility gate 已失败，继续测量会违反 fail-fast 决策 |
| Script startup | 未执行 | 无有效 Bun dependency tree，无法形成等价 script 输入 |
| Full Jest | 未执行 | 无有效 Bun dependency tree；未用 `--ignore-scripts`、0 tests 或 skip 制造结果 |
| Vite production build | 未执行 | 无有效 Bun dependency tree；build compatibility 不可达 |
| Docker build | 未执行 | 本机无 Docker CLI，且候选在 frontend build 前的 clean install 已失败 |
| CI dependency phase | 未执行 | 没有同边界至少 3 次真实 workflow step 样本，不选择性截取子阶段 |

## Compatibility 审计

| 门禁 | 结果 | 说明 |
|------|------|------|
| Bun text lock generation | 通过 | 两次生成相同 lock SHA-256 |
| Bun frozen clean install | **失败** | 两次 exit 1，深层 dependency links 缺失 |
| 关键 resolution | 部分一致但不足以放行 | 已落盘样本中 Jest `27.5.1`、Vite `8.1.4`、plugin-react `6.0.3`、Router `5.3.4`、Cypress `12.15.0`、face-api `0.22.2`、`rc-virtual-list=3.18.2` 一致；部分 manifest 因安装失败缺失 |
| Cypress lifecycle/binary | **失败** | postinstall 分别缺失 `execa` / `safer-buffer`，未形成可验证 Bun binary |
| Husky/lint-staged | **失败/不可达** | 两次 Bun sample 都未生成 hook；Yarn CI-mode control 同样未生成 hook，因此不把 hook 单项作为性能差异，但 Bun install 已先失败 |
| Web3/native dependencies | **失败/不可达** | ENOENT 集中出现在 Web3/ethers 深层树；Rolldown/Lightning CSS/Linux binding 未能进入 build 验证 |
| Public scripts | 不可达 | `prebuild` downstream 未执行；未修改或生成 tracked public JS |
| Jest/Vite | 不可达 | 保持 Jest + Vite 边界，未迁移 Bun test/Vitest，也未对无效 tree 运行伪 benchmark |
| Docker | 静态审计 | `deploy/Dockerfile` 当前 Node 24 frontend stage 复制 `package.json + yarn.lock`、Yarn frozen install/build，并从 `web-admin/build` 复制产物；本次 NO-GO 保持不变 |

## OpenSpec 与 review 证据

| 检查 | 结果 |
|------|------|
| Workspace 起始 clean/aligned、目标分支新建 | 通过 |
| 除目标 change 外的 active change 冲突 | 无 |
| Jest 解耦前置条件 | 已在 base 归档，满足 |
| Pre-implementation review | READY；Blocking 0、Fixable 0 |
| Pre-archive review | READY；Blocking 0、Fixable 0；后续按主控授权使用 `--skip-specs` 归档 |
| OpenSpec archive | 通过；CLI 明确输出 `Skipping spec updates (--skip-specs flag provided)`，未创建或修改 package-manager 主规格 |
| OpenSpec target/changes strict | 通过；changes 1/1 |
| OpenSpec main specs strict | rebase 前 44/44、rebase 后 45/45 通过 |
| `git diff --check` / placeholder / EOF | 通过 |

## Coverage 与运行态说明

- Changed implementation coverage：N/A。最终没有修改 production implementation、package metadata、lockfile、workflow、Docker、local-dev 或契约测试；只有 OpenSpec artifacts 和评估证据。
- Browser/真实 provider smoke：N/A。NO-GO 未改变前端 bundle、依赖、登录壳、首页、路由、OIDC/CAS callback 或 Provider/Web3 加载拓扑；未使用真实账号、token 或 endpoint。
- Docker：真实 build 未执行，不能写成通过；对 NO-GO 结论无反向影响，因为 Bun 已在 Docker frontend install 的前置等价阶段失败。

## Remaining Risk / 后续条件

- 未取得有效 Bun 性能、Jest、Vite 或 Docker 样本；这是 NO-GO 的直接结果，不是被隐藏的通过项。
- 当前证据无法区分根因属于 Bun Windows linker、Yarn-lock import 组合或具体依赖树交互；本 change 不通过升级 Bun、Cypress、Web3 或业务依赖扩大范围。
- 若未来 Bun linker 修复或依赖树因独立业务 change 合法变化，主控可新建评估 change，重新执行至少 3 个有效冷安装样本和完整兼容门禁；不得复用本次失败耗时宣称收益。
- RC 轻审后已获主控授权 self-closeout：只归档 NO-GO 历史并更新技术债状态，不同步 delta specs，不合入或 push `test`；最终 base/分支/lease 状态以 closeout 回传为准。
