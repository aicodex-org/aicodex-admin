# 验证记录

## 决策摘要

- 结论：**NO-GO**。
- Bun 1.3.14 的 `copyfile` backend 确实生效，代表性已物化文件的 `nlink=1`；但 3 个 Cypress 15.18.1 主样本的真实 frozen lifecycle install 全部 exit 1，分别出现 59、131、76 条 ENOENT，0/3 形成完整依赖树。
- 三个主样本均缺 Cypress lifecycle 所需的 `bluebird`，均未生成 Cypress binary；`safer-buffer` 三轮均缺失，Web3/ethers 目标在不同轮次缺失 `ethers`、`@metamask/eth-sig-util` 或 `bnc-sdk`。
- 独立诊断样本将 `--concurrent-scripts` 降为 1 后仍 exit 1、97 条 ENOENT，仍缺 `bluebird`、`safer-buffer`、`execa` 和 `bnc-sdk`。失败发生在日志所示的 `moving "<package>" to cache dir failed` 阶段，早于 Cypress lifecycle 和 copyfile 物化，因此不支持“仅 lifecycle 并发导致”的解释。
- 相同候选 `package.json` SHA-256 输入生成的三份 lock hash均不同，entries为 1736/1742/1742；三份 `node_modules` tree shape hash也均不同。
- 正式 workspace 未修改 `package.json`、lock、config、workflow或业务代码，只保留本 OpenSpec 评估证据。change保持 active RC，不 archive、不合入 base/test、不释放 lease。

## 基线与隔离边界

| 项目 | 值 |
|---|---|
| 起始 base | `origin/hfl-test-base@0bd451b4a2c631af3f537e3282972d91cb757533` |
| 起始 `origin/test` | `5420c8c386de7daee84b7df41de65ba1c404bf2a`（只读，未 push/merge） |
| OS / Node.js | Windows 11 x64 / `v24.14.0` |
| Yarn / Bun | `1.22.22` / `1.3.14` |
| 当前 / 候选 Cypress | lock实际 `12.15.0` / 临时候选 `15.18.1` |
| 候选package SHA-256 | `ED442141F4A2FBF4BE2A6CADDDC50C4129B7843DC9D750779CC1C0347231D34F` |

- 每个样本从 `git archive HEAD web-admin` 取得 tracked输入，使用短路径、空 `node_modules`、独立空 lock cache、install cache和Cypress cache，并严格串行运行。
- 临时候选固定 `cypress=15.18.1`、`packageManager=bun@1.3.14`、Bun-only guard/prebuild和 `trustedDependencies=["cypress"]`，并删除临时 `yarn.lock`。
- 每轮真实执行 `bun install --lockfile-only`，随后执行 `bun install --frozen-lockfile --backend=copyfile`；诊断轮额外使用 `--concurrent-scripts=1`。
- 未使用 `--ignore-scripts`、手工补包、Yarn依赖树/cache、双lock、跳过Cypress binary、禁用guard或Bun canary/未发布PR构建。
- 使用本机既有包源配置，但未读取或记录 endpoint、credential、header、token、Cookie或认证响应。

## 主样本矩阵

| 样本 | Lock generation | Frozen copyfile install | Cypress | 关键缺失 | 有效样本 |
|---|---|---|---|---|---|
| `m1` | 7.381s，exit 0，1736 entries，SHA-256 `5793153E7956A92C2D301EBE147529FE0CC9939C87E11EE0481672197DFA0A0A` | 191.627s，exit 1，59条ENOENT | manifest存在；version/verify exit 1；binary 0 | `bluebird`、`safer-buffer` | 否 |
| `m2` | 7.765s，exit 0，1742 entries，SHA-256 `FF059A1E161C885FEA10F4D83945A3310958AFEEAA600A1CEFD2EBC2407DFB91` | 200.978s，exit 1，131条ENOENT | manifest存在；version/verify exit 1；binary 0 | `bluebird`、`safer-buffer`、`ethers` | 否 |
| `m3` | 8.361s，exit 0，1742 entries，SHA-256 `005BEB0063628383859CF8904A65ADD3EBE009554B074BC71383DE75D29AD90F` | 169.782s，exit 1，76条ENOENT | manifest存在；version/verify exit 1；binary 0 | `bluebird`、`safer-buffer`、`execa`、`@metamask/eth-sig-util`、`bnc-sdk` | 否 |

Lock package-key集合也不稳定：`m2` 相比 `m1` 多6个 Jest/stylelint 下的 `micromatch`/`picomatch` 深层entry；`m2` 与 `m3` entries总数相同，但各有1个独有深层entry。当前证据不把lock不确定唯一归因到resolver或外部包源，只记录相同输入的可复现不确定性。

## 依赖树、磁盘与 copyfile 证据

| 样本 | `node_modules` files / bytes | Tree shape SHA-256 | Install cache files / bytes | Cypress cache |
|---|---|---|---|---|
| `m1` | 71300 / 426942092 | `A6E3A426234B13DAA664BAE377A07CB326EC71DC30D85E55E93DE8469323B47B` | 76710 / 480343672 | 0 files |
| `m2` | 71663 / 418862873 | `D9FBB6F05A37E81F0E1D8D6CE194A7AA93FB632CCA777D8F0E73D6A2BBDDC39C` | 76663 / 469944895 | 0 files |
| `m3` | 70013 / 394935602 | `71F4DE65B0D4E57496464B6608334C945F256F91945D3435A5949B01909C44D8` | 76818 / 456556106 | 0 files |

- 三轮已物化的 Cypress/Web3/基础包代表性 `package.json` 均为 `nlink=1`，证明 `copyfile` backend已使用，而不是静默回退到共享hardlink。
- `copyfile` 的 `node_modules` 不与Bun cache共享hardlink；即使未来安装成功，也会同时保留约数百MB的cache和独立文件副本，存在更高物理磁盘占用与更慢安装的成本。
- 三轮均无有效安装，失败耗时不得用于20%收益比较；本 change不新增Yarn性能control，也不宣称copyfile优于现有Yarn基线。

## 单并发诊断样本

| 样本 | Lock | Install | 结果 |
|---|---|---|---|
| `d1`，`--backend=copyfile --concurrent-scripts=1` | 7.810s，exit 0，1737 entries，SHA-256 `EFE80E42F87E610D487B2626FCA9978AF1F54D068C795AE80BFC825653690157` | 175.630s，exit 1，97条ENOENT | Cypress version/verify exit 1、binary 0；缺 `bluebird`、`safer-buffer`、`execa`、`bnc-sdk`，tree shape `F8FD53FEA599383CC8600C64BAFABEBF9FB77CF144FABF03137BD33E32FF1B40` |

诊断轮仍在cache移动阶段记录大量失败，随后Cypress才因 `Cannot find module 'bluebird'` 失败。降低 lifecycle并发度没有改变失败层级，因此copyfile不能绕过当前Bun cache/tar extraction完整性问题；诊断样本不计入3个主样本，也不改变主样本判定。

## 官方资料审计

| 资料 | 状态/版本/OS | 关联判断 |
|---|---|---|
| [Bun PR #33113](https://github.com/oven-sh/bun/pull/33113) | 2026-06-30 opened，当前 open，未发布；Windows hardlink并行 `CreateHardLinkW` 与 Defender过滤路径 | **相关但不是已发布修复**：证明默认hardlink存在Windows专属问题；不证明缺文件已修复，也不能覆盖本次copyfile在cache阶段失败。 |
| [Bun issue #32458](https://github.com/oven-sh/bun/issues/32458) | Bun 1.3.14 / Windows 11 / Node 24.14.0；2026-06-17 opened，当前 open，无修复版本 | **相同症状与环境，根因高度相关但未唯一证明**：报告tarball extraction漏深层文件；本次独立样本也在cache阶段出现缺包/深层文件。 |
| [Bun install文档](https://bun.com/docs/pm/cli/install) | 当前官方文档；说明trusted lifecycle、backend、cache与 `--concurrent-scripts` | **直接方法依据**：`copyfile` 是物化fallback且较慢；包先进入cache再物化，因此不能天然修复上游提取缺失。 |
| [Bun 1.3.14 release note](https://bun.com/blog/bun-v1.3.14) | 2026-05-13稳定版 | 未声明修复 #33113/#32458，不能把开放PR或当前稳定版写成已解决。 |

公网信息只用于提出与解释假设；`NO-GO` 来自本机4个隔离样本，而不是issue/PR状态。

## 条件门禁与停止点

| 门禁 | 状态 | 说明 |
|---|---|---|
| 3个copyfile主样本 | **失败** | 0/3有效，按spec立即固定 `NO-GO`。 |
| Cypress CLI/binary/verify | **失败** | 三轮均缺 `bluebird`，binary 0。 |
| Web3/ethers完整性 | **失败** | 不同轮次缺 `ethers`、`@metamask/eth-sig-util` 或 `bnc-sdk`。 |
| 有效冷安装/Yarn control/20%收益 | 未执行 | 只在3/3主样本成功后运行；失败样本不得计入收益。 |
| Jest/test:ci、typecheck、lint、Vite/public scripts/build | 未执行 | 无完整依赖树，不在无效tree上伪造质量门禁。 |
| 19 E2E / branch CI | 未执行 | Cypress binary不可达，且未对60或共享DB执行破坏性E2E。 |
| Docker/CI/action Bun lock | 未执行 | 成功路径条件未满足，不保留候选workflow。 |
| Changed implementation coverage | N/A | 最终只有OpenSpec评估文档，无生产实施代码。 |
| 代码注释门槛 | N/A | 无源码、配置、脚本或workflow实施diff。 |

主控已明确后续 Cypress→Playwright 和退役未使用Web3 由独立change推进；本 change不扩大范围。

## OpenSpec、Git 与清理

- 提案实施前已完成 target/all changes strict validation，pre-implementation review为 READY，Blocking/Fixable均为0。
- 自建短路径样本根、4轮样本的cache/binary/log/`node_modules`、browser-act临时指南及本地评估harness/计划文件均已清理；未清理workspace既有依赖或未知用户产物。
- 收口门禁：target strict exit 0；all changes为1/1；all specs为45/45；incremental TypeScript gate exit 0；`git diff --cached --check` exit 0。
- 中文/脱敏/占位符/禁止写集审计无阻断项；语言扫描仅命中 `copyfile`、`lifecycle`、`install` 等技术词。全部change文件为UTF-8无BOM、以LF结尾，无replacement character或NUL。
- Pre-archive review：READY，Blocking 0、Fixable 0。proposal/design/spec/tasks/verification语义一致；无生产实施代码，覆盖率与代码注释门槛为N/A；未将不可达的质量/E2E/CI门禁写成通过。
- RC工作分支已确认推送；最终状态保持最新base之上单个逻辑commit，具体HEAD由结构化交接回传。`push_test=false`、`archive=false`、`merged_push_base=false`、`lease_release=false`、`needs_master_decision=true`。
- 本 change保持 active/unarchived；`NO-GO` 后续若获主控closeout授权，应使用 `--skip-specs` 归档，不创建或更新 `admin-bun-copyfile-backend-evaluation` 主规格。

## Remaining Risk

- 当前证据能定位“切换copyfile仍在cache/extraction层失败”，但不能在不修改Bun或安装未发布构建的前提下唯一定位resolver、tar extraction、cache移动、Windows过滤器或其组合根因。
- 没有有效Cypress 15/Bun tree，因此没有质量、E2E、branch CI或20%收益证据；这是 `NO-GO` 的直接结果，不是待补通过项。
- copyfile不共享cache hardlink的真实物理磁盘增量未在失败样本上精确测量；现有 `nlink=1`、逻辑字节与官方backend语义足以证明成本方向，但不足以形成成功路径容量基准。
- 只有Bun稳定版明确发布相关Windows install修复，或Admin依赖树由独立合法change发生实质变化后，才适合重新评估；不得复用本次失败耗时宣称性能收益。

## 主控决策后的历史归档

- 2026-07-16 主控接受 `NO-GO` 并授权 self-closeout；上文 active RC、工作分支与 `needs_master_decision=true` 字段是主控决策前的交付快照。
- 执行 `openspec archive evaluate-admin-bun-copyfile-backend-workaround --skip-specs --yes`，CLI 明确输出 `Skipping spec updates (--skip-specs flag provided)`。
- 归档后 active change不存在，历史路径为 `openspec/changes/archive/2026-07-16-evaluate-admin-bun-copyfile-backend-workaround/`。
- `openspec/specs/admin-bun-copyfile-backend-evaluation/spec.md` 归档前后均不存在；主规格目录数保持45，tree `511914d52e25cccf021ceefb2b63464a134a792e` 未变化，未同步“已采用copyfile/Bun”的主规格。
- 归档后 `openspec validate --changes --strict` 无 active items，`openspec validate --specs --strict` 为45/45，`git diff --check` 通过；中文、脱敏、占位符与EOF审计无阻断项。
- 最终 closeout状态以结构化回传中的base push、工作分支删除、workspace clean/aligned和 `lease_release=true` 为准。
