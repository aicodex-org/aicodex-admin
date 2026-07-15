## Context

`web-admin` 当前使用 Yarn Classic `1.22.22` 和唯一 `yarn.lock`。`package.json` 的 `preinstall` 拒绝非 Yarn 安装，`prebuild` 直接调用 Yarn；GitHub Actions、Dockerfile、Makefile、local-dev、开发文档和 `FrontendCiGates.test.ts` 也把 Yarn 写入 cache/install/script 契约。应用构建已迁移到 Vite，测试已迁移到仓库自有 Jest 27 配置，因此本 change 只评估 package manager 和 script orchestration，不重新选择 build/test runner。

本地评估环境固定记录 Node、Yarn、Bun 和 Docker 版本。registry 地址、认证参数和完整私有 endpoint 不进入命令日志或验证文档。性能样本串行执行，不与 subagent、build 或其它 benchmark 并行。

## Evaluation Outcome

最终结论为 **NO-GO**。Bun `1.3.14` 从同一 Yarn truth 生成了稳定、相同 SHA-256 的 text lock，但在系统临时路径和短路径两次独立 `--frozen-lockfile` 真实 lifecycle install 中均产生数百个深层 `node_modules` `ENOENT`，并分别因 Cypress 缺失 `execa` / `safer-buffer` 使 postinstall 退出 1；Husky hook 未生成。相同短路径、空 Yarn/Cypress cache 的 Yarn frozen lifecycle control 完成安装并保留原 `yarn.lock` 哈希。

因此 Bun 没有有效冷安装样本，无法计算 20% 收益中位数，也无法形成等价 Jest/Vite/Docker 样本。按预先批准的“兼容失败或有效样本不足即 NO-GO”规则，本 change 不进入契约测试或实现迁移，当前 Yarn 单真值保持不变。

## Goals / Non-Goals

**Goals:**

- 用可复现、多次运行的同机对照证明或否定 Bun 的安装/CI dependency 收益。
- 在性能阈值之外验证 frozen lock、dependency resolution、Jest discovery、Vite、public scripts、Cypress、Web3/face-api/native/postinstall 和 Docker 兼容面。
- 只有 GO 时才把 package metadata、lockfile、CI、Docker、本地入口和维护文档切换为 pin 版本 Bun，并保持一个 package manager/lockfile 真值。
- 保存足以审查 GO/NO-GO 的脱敏原始样本、统计方法、命令和限制。

**Non-Goals:**

- 不迁移到 `bun test` 或 Vitest，不升级 Jest/Vite。
- 不升级 React、React Router、Testing Library 或任何业务依赖。
- 不修改业务页面、路由、认证 callback、Provider/Web3 行为、Go 后端或生产配置。
- 不建设 Yarn/Bun 双运行矩阵，不长期保留双 lockfile，不把 package manager 评估扩展成依赖治理平台。

## Decisions

### 1. 采用 threshold-gated 单真值方案

推荐路线是在同一 change 中先 benchmark，只有 GO 才应用迁移：

- 方案 A（采用）：阈值门禁后一次性切换 Bun 单真值。它让收益证据、兼容性和实施写集保持在同一可审查单元。
- 方案 B（条件结果）：证据未达标即 NO-GO，保留 Yarn，仅提交评估和决策证据。
- 方案 C（拒绝）：长期同时维护 `yarn.lock` 与 Bun lock、CI 双跑两套安装。该方案增加 resolution 漂移与维护成本，违背迁移目标。

### 2. benchmark 使用隔离副本、交替顺序和中位数

- 每个 package manager 使用仓库同一提交的隔离临时副本；不在 tracked workspace 删除/替换 `node_modules` 或 lockfile。
- 冷安装至少 3 个有效样本，每个样本使用全新 workspace 与全新 package-manager cache；缓存安装至少 3 个有效样本，保留对应 cache 但移除 `node_modules`。
- 每一轮交替 Yarn/Bun 顺序，所有测量串行运行；记录 wall-clock 秒数、退出码、版本和异常，不记录 registry credential。
- script startup 使用临时副本中的等价 no-op npm script，至少 10 次测量并报告中位数。
- 完整 Jest 与 Vite build 各至少 3 个有效样本；清理各自 Jest/Vite/build cache，使用相同 runner/config 和等价环境变量，报告 discovery/suite/test 数量及中位数。
- 主判定公式为 `(Yarn median - Bun median) / Yarn median * 100%`。Bun 隔离冷安装必须改善 `>=20%` 才满足收益阈值；缓存安装和 script startup 只作为辅助收益指标。只有能够从 package-manager setup/cache restore 开始、到 frozen install 完成结束，以相同 runner/cache policy 连续取得至少 3 次 Yarn/Bun workflow step 样本时，才记录真实 CI dependency 指标，且该指标不替代冷安装门禁。Jest 和 Vite build 的 Bun 中位数分别不得比 Yarn 慢 `>10%`，除非有可复现、已修复或被批准的非 package-manager 原因。
- DNS/registry/系统更新、后台高负载、样本失败或样本数不足会使对应结论不可复现；不可复现即 NO-GO，不以挑选最好一次替代。

### 3. Bun candidate 在临时副本中先验证，再触达 tracked 实现

Yarn 基线保持原样。Bun 候选在隔离副本中仅做预期迁移所需的 package metadata/script 调整，生成 Bun text lock 并执行 frozen install；对比 top-level direct dependency 版本和 lock resolution 异常。只有性能与所有兼容门禁通过后，才在工作分支按相同最小 diff 实施。

GO 时 pin 当前验证通过的 Bun 精确版本到 `packageManager`、CI setup 和 Docker frontend stage。所有开发/CI命令通过 `bun run` 调用既有 Vite、Jest、TypeScript、ESLint、public scripts 和 Cypress binary；禁止把 Jest suite 交给 Bun test runner。

`public-scripts:smoke` 和其它显式 `node` 入口继续使用 Node runtime；迁移 package manager 不等于删除 Node。Bun candidate 还必须证明 `resolutions` 对 `rc-virtual-list@3.18.2` 的约束等价生效，并审计 Bun trusted lifecycle：Cypress、Husky 以及可证明需要的 native install script 必须执行或以最小显式 allowlist 处置，禁止全局 `--ignore-scripts`。

### 4. lockfile 与依赖版本保持单一且可审计

GO 路径生成并提交一个 Bun text lock，删除 `yarn.lock`。迁移前后比较 `package.json` direct dependencies/devDependencies 的声明与解析版本，不借 lock 重解算升级 React/Router/Testing Library/Jest/Vite/业务依赖。`bun install --frozen-lockfile` 必须在无现成 `node_modules` 的隔离副本成功。

NO-GO 路径不改 `package.json` 的 Yarn guard，不删 `yarn.lock`，也不提交候选 Bun lock。

### 5. Docker 缺失时只允许有限的审计等价证据

真实 Docker CLI 可用时，Yarn/Bun baseline/candidate 必须以相同 build context 和等价 cache 状态各运行多次 Docker frontend/full build。当前固定 workspace 未安装 Docker CLI，因此本机只能审计 Dockerfile stage、base image、lock copy、frozen install、build output copy，并在隔离目录执行等价 clean install + production build；验证记录必须把真实 Docker build 标为未执行，不能写成通过。若其它兼容门禁全部成立，这一限制作为 RC 剩余风险交给具备 Docker 的 CI/主控补证，而不是泄漏或臆造环境。

### 6. 契约测试先失败再实施

若 benchmark 判定 GO，先修改/新增 `FrontendCiGates` 等契约测试，要求 packageManager pin、唯一 Bun lock、frozen install、CI/Docker/Makefile/local-dev/public scripts 使用 Bun 且不出现 Yarn 双真值；确认测试在 Yarn 现状按预期失败，再实施最小配置变更。package manager/config 变更没有可被 Jest statement coverage 可靠度量的 production implementation；coverage 以受影响契约测试真实执行和 changed implementation N/A 说明处理，不用业务源码行数制造覆盖率。

## Risks / Trade-offs

- [Registry 网络抖动使冷安装结果失真] → 隔离 cache、交替顺序、至少 3 个样本、中位数与失败样本全量记录；无法复现即 NO-GO。
- [Bun 从 Yarn lock 导入时解析出不同传递版本] → 对照 direct dependency 和关键高风险包解析，frozen reinstall；不允许顺手升级依赖。
- [postinstall/native/Cypress binary 在 Bun 下行为不同] → 不用 `--ignore-scripts` 作为最终兼容证明，审计安装日志并执行 Cypress verify/可用性检查与 public scripts/build smoke。
- [Husky 4 或 Bun trusted dependency 策略跳过 lifecycle] → 在隔离 clean clone 验证 hook 与必需 binary/native 产物，只允许最小、可解释的 trusted dependency 列表。
- [Windows 通过但 Linux native binding 失败] → Docker/CI 层验证 Rolldown、Lightning CSS、Web3 optional native binding；本机无 Docker 时明确保留这一剩余风险。
- [Web3/face-api CommonJS 或浏览器懒加载只在运行时失败] → production build 后执行首页、登录壳、刷新、callback 和 Provider/Web3 懒加载 browser smoke，检查 console/page/chunk errors。
- [CI cache key 或 Docker copy 仍引用 Yarn] → 用仓库契约测试和全仓 Yarn token 扫描阻止残留双真值。
- [本机无 Docker CLI] → 仅保留静态/等价门禁和明确风险，不把它表述为真实 Docker build。
- [Bun 版本变化导致不可复现] → GO 时精确 pin 已验证版本；升级另立 change。

## Migration Plan

1. 已完成 package/lock、CI、Docker、local-dev、lifecycle/native inventory 和两次 Bun/一次 Yarn 隔离安装验证，形成 NO-GO 记录。
2. 保持 `package.json` Yarn guard、`yarn.lock` 和所有当前调用方不变；删除候选 Bun 行为 delta，不提交临时 Bun lock或安装产物。
3. pre-archive review 至 READY 并推送证据型 RC 工作分支；主控轻审后授权 self-closeout，使用 `--skip-specs` 归档 NO-GO 历史，不同步条件式 Bun delta，且不操作 `test`。

本次没有实现迁移，不需要 runtime 回滚。未来若重新评估，仍不得通过同时提交两份 lockfile 作为回滚机制。

## Open Questions

- 是否在修复/升级 Bun linker 或依赖树发生独立变化后重新立项，由主控决定；本 change 不擅自升级 Bun、Cypress、Web3 或其它依赖来规避 NO-GO。
