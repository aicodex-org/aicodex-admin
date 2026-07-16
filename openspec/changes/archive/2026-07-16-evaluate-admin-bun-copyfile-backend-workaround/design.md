## Context

Admin当前仍以 Yarn 1.22.22和 `yarn.lock` 为单一依赖真值。前两轮Bun 1.3.14评估分别证明：原始Cypress 12依赖树在默认 Windows hardlink backend出现715/803个深层ENOENT；升级到Cypress 15.18.1并显式信任其lifecycle后，3个样本仍有84-92个ENOENT，均缺 `bluebird`/binary且Web3深层树不完整。

Bun 1.3.14稳定版提供 `--backend=copyfile`。开放PR #33113说明Windows hardlink物化路径存在专属并发/过滤器问题，但尚未合并发布；开放issue #32458则提示同版本下tarball extraction本身可能漏文件。copyfile只替换物化方式，不能预设它会修复上游提取缺失。

## Goals / Non-Goals

**Goals:**

- 用3个相互隔离的主样本验证 `copyfile` 是否形成可重复、完整且可执行的Cypress15/Admin依赖树。
- 区分 lock解析、tarball/cache提取、node_modules物化和Cypress lifecycle阶段的失败证据。
- 记录 Cypress、基础传递依赖及Web3/ethers深层包的manifest、入口文件与解析完整性。
- 记录 copyfile的安装耗时、node_modules/cache逻辑字节、代表文件link count及“不共享hardlink”的磁盘成本。
- 只有兼容性门禁通过后，才进入性能、质量、E2E和CI完整门禁。

**Non-Goals:**

- 不安装Bun canary或未发布PR构建，不修改Bun源码。
- 不把 `--concurrent-scripts=1` 诊断样本计入3个主样本或性能收益。
- 不用 `--ignore-scripts`、手工补包、Yarn tree/cache、双lock或跳过binary制造通过。
- 不修改正式package/lock/config/workflow/业务代码，除非全部门禁达到 `GO-CANDIDATE` 且主控需要审阅。
- 不对60或共享数据库运行破坏性E2E，不迁移Playwright/Bun test或升级其它依赖。

## Decisions

1. **主样本固定为 `copyfile`，其余输入与上一轮Cypress15候选一致。** 每轮从 `git archive HEAD web-admin` 创建短路径副本，固定 `cypress=15.18.1`、`packageManager=bun@1.3.14`、Bun guard/prebuild及 `trustedDependencies=["cypress"]`，删除临时 `yarn.lock`。这样唯一新增实验变量是backend。
2. **lock与install cache分离且样本间完全隔离。** 每轮使用独立空 lock cache、install cache和Cypress cache，先 `bun install --lockfile-only`，再 `bun install --frozen-lockfile --backend=copyfile`；严格串行，避免并发I/O干扰。
3. **exit 0不是完整性通过。** 每轮检查 lock hash/entries、ENOENT、Cypress manifest/binary/verify、`bluebird`/`safer-buffer`/`execa`、`ethers`、`@ethersproject/providers`、`@metamask/eth-sig-util`、`@metamask/abi-utils`、`@metamask/utils`、`bnc-sdk`、`@web3-onboard/core`和 `viem`。除manifest外，还检查 `main`入口存在、关键模块可 `require.resolve`或由对应模块系统解析，并汇总目标目录中的缺失/空文件异常。
4. **诊断样本只在主样本失败时追加。** 使用新的独立副本/cache运行 `--backend=copyfile --concurrent-scripts=1`。若其仍在install期间出现依赖文件ENOENT，则不支持“仅lifecycle并发”假设；若依赖物化完整而lifecycle表现变化，只记录原因线索，最终主样本任一失败仍为 `NO-GO`。
5. **copyfile成本用可观察指标记录。** 记录node_modules与Bun cache逻辑字节、文件数和代表文件 `nlink`；copyfile样本的node_modules不与cache共享hardlink，因此即使成功也可能增加磁盘占用并降低安装性能。没有同边界有效样本不得推导20%收益。
6. **成功路径继续完整门禁。** 仅3/3主样本成功且树完整时，运行至少3个有效冷安装样本的中位数、Yarn同边界control、Cypress verify/19 E2E授权环境或branch CI、Jest/typecheck/lint/Vite/public scripts/build、Web3 bundle、Docker与action Bun lock路径。无法闭环则最多 `BLOCKED`。
7. **公网证据只指导归因。** 优先Bun/Cypress官方issue、PR、release notes，记录版本、OS、状态、workaround和关联强度；开放PR/canary不得写成稳定修复。
8. **失败时正式workspace只保留证据。** `NO-GO`不创建或更新主规格，也不保留package/lock/config/workflow候选；临时根、cache、binary、日志和node_modules全部清理。

## Risks / Trade-offs

- [copyfile仍依赖同一下载/提取cache] → 通过独立空cache和目标入口文件检查识别tarball extraction缺失，避免误归因hardlink。
- [lock生成本身不确定] → 对比3轮package输入hash、lock hash、entry集合和版本，单独报告resolver层差异。
- [lifecycle并发掩盖物化结果] → 只在失败后追加单并发诊断样本，且不改变主样本判定。
- [copyfile消耗更多磁盘] → 记录node_modules/cache逻辑字节、文件数和link count；性能/容量不达标时不得GO。
- [Cypress binary下载噪声] → 每样本独立Cypress cache，明确下载成本；只有有效样本才参与中位数。
- [E2E需要隔离数据环境] → 无授权隔离DB时不运行共享环境，改用真实branch CI或判定 `BLOCKED`。

## Migration Plan

1. 完成OpenSpec提案与实施前strict review。
2. 运行3个copyfile主样本并逐项审计依赖树。
3. 若失败，运行一个可选单并发诊断样本并收敛 `NO-GO`；若成功，进入完整质量/性能/E2E/CI门禁。
4. 编写脱敏verification、完成pre-archive review、清理临时产物并push单个RC commit。

回退策略：所有候选仅位于临时副本；删除本任务自建且已核对的临时根即可恢复。不得删除workspace既有 `node_modules` 或未知用户产物。

## Open Questions

无。是否正式采用copyfile或等待Bun稳定修复由RC证据完成后的主控决策决定。
