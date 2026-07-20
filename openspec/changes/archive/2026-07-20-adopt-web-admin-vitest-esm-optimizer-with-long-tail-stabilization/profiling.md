# Admin Vitest ESM optimizer profiling 证据

> 实施结果更新：设计profiling证明了module graph与性能杠杆，但正式实施的第二次默认完整轮在范围外owner `ApplicationEditPageUiCustomization.test.tsx` 触发5349ms默认timeout。本change最终NO-GO并回退候选；以下数据保留为设计输入，不代表公共runner已采用。正式结果见 `verification.md`。

## 1. 结论

- 推荐候选：测试专用 exact ESM root alias + `test.deps.optimizer.client.include=["antd", "@ant-design/icons"]` + `exclude=["react-dom"]`。
- 推荐理由：默认顺序 `821.224s`、file-only shuffle `784.191s`，均为 157/157 paths、1510/1510 tests、0 failure/timeout/unhandled、`multiple renderers=0`，进程树峰值低于 2GiB。
- 相对当前 `3579.75s` 普通全量，wall time分别缩短 77.06% 与 78.09%，约快 4.36 倍与 4.56 倍；仍比历史 Jest `543.836s` 慢 51.01% 与 44.20%，因此不宣称优于 Jest。
- include-only 候选虽更快，但稳定产生第二 React renderer warning，已拒绝；`react-dom` exclude 是本轮唯一正确性修订单变量。
- 当前阶段只写 OpenSpec artifacts；候选 config、reporter、cache、sentinel 与原始日志均为 ignored 或 `%TEMP%` 证据，不进入 tracked diff。

## 2. 环境与基线

| 项目 | 结果 |
| --- | --- |
| base | `91b7f8b4a46c116a59a99b51dbc29faac18ab650` |
| Bun / Node | 1.3.14 / v24.14.0 |
| Vitest / Vite / jsdom | 4.1.10 / 8.1.4 / 28.1.0 |
| AntD / icons | 5.29.3 / 5.6.1 |
| 资源档位 | 12逻辑CPU、约32GiB内存 |
| 竞争测试进程 | 正式完整轮开跑前为0 |
| 当前Vitest普通全量 | `3579.75s` |
| 当前Vitest coverage | `3824.30s` |
| 历史Jest普通全量 | `543.836s` |
| correctness基线 | 157 paths / 1510 tests |
| cache身份 | 完整候选为同一任务、同一metadata的warm optimizer cache；不与冷CI直接比较 |

## 3. 单变量矩阵

### 3.1 renderer focused gate

固定 owner 为 `ApplicationEditPageUiCustomization.test.tsx` 与 `RolePermissionEditPages.test.tsx`，共2 files / 29 tests。

| 配置 | 结果 | Duration | multiple renderers |
| --- | --- | ---: | ---: |
| 公共未优化config | 29/29通过 | 约73.99s | 0 |
| exact ESM roots + include only | 29/29通过 | 约18.1s | 11 |
| include + `exclude=["react-dom"]`，默认顺序 | 29/29通过 | 17.44s | 0 |
| 同一exclude候选，独立进程反序 | 29/29通过 | 16.96s | 0 |

include-only候选关闭 profiler `importDurations` 后 warning仍复现，排除了 reporter 本身。bundle审计定位到 optimizer 产物内嵌 `react-dom` 与 rc-util renderer，而 RTL/应用使用外部 ReactDOM。加入唯一exclude后，`antd.js`改为两条外部 `react-dom` import，不含 `react-dom/client`、`react-dom/test-utils`，focused warning归零。

### 3.2 完整运行

| 候选 | 顺序 / cache | paths / tests | 结果 | wall | Vitest分项 | 资源 | warning |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| include only | 默认 / warm | 157 / 1510 | 0 failure/timeout/unhandled | 771.134s | transform 8.85s；setup 56.22s；import 109.23s；tests 360.92s；environment 186.64s | avg 0.752核；peak 1077.2MiB；8进程 | renderer 13，拒绝 |
| include only | shuffle seed `20260720` / warm | 157 / 1510 | 0 failure/timeout/unhandled | 732.053s | transform 8.00s；setup 55.33s；import 103.83s；tests 331.69s；environment 184.40s | avg 0.944核；peak 1131.5MiB；9进程 | renderer 11，拒绝 |
| include + exclude `react-dom` | 默认 / warm | 157 / 1510 | 0 failure/timeout/unhandled | 821.224s | transform 8.64s；setup 61.77s；import 114.20s；tests 373.05s；environment 205.83s | avg 0.911核；peak 1058.7MiB；6进程 | renderer 0，推荐 |
| include + exclude `react-dom` | shuffle seed `20260720` / warm | 157 / 1510 | 0 failure/timeout/unhandled | 784.191s | transform 8.16s；setup 58.52s；import 107.40s；tests 366.58s；environment 192.51s | avg 3.316核；peak 1129.6MiB；7进程 | renderer 0，推荐 |

资源采样的平均CPU来自进程树累计CPU时间/墙钟时间；Windows短生命周期子进程采样会造成轮次差异，因此只用于档位与失控审计，不作为精确CPU基准。两轮peak均远低于2GiB，系统未出现失去响应或OOM。

### 3.3 optimizer metadata 与模块边界

- `_metadata.json`：`configHash=b3156f37`、`lockfileHash=c431c5f5`。
- `antd`源为 `antd/es/index.js`，`@ant-design/icons`源为 `@ant-design/icons/es/index.js`，两者 `needsInterop=false`。
- `antd.js`保留外部 `import * as ... from "react-dom"` 与 `import { flushSync } from "react-dom"`。
- `antd.js`中 `react-dom/client` 与 `react-dom/test-utils`引用均为0。
- alias是精确根匹配，`antd/es/*`等subpath不进入根alias。
- cache位于 ignored 目录，未修改 `bun.lock`；实现阶段必须再次证明可由当前lock/config重建。

## 4. warning 分类

| 轮次 | pseudo-element | CSS parse | navigation | multiple renderers | React act | FakeTimers/native timer | unhandled |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| include-only默认 | 289 | 10 | 1 | 13 | 0 | 0 | 0 |
| include-only shuffle | 289 | 10 | 1 | 11 | 0 | 0 | 0 |
| exclude默认 | 289 | 10 | 1 | 0 | 0 | 0 | 0 |
| exclude shuffle | 289 | 10 | 1 | 0 | 0 | 0 | 0 |

pseudo/CSS/navigation保持可见且两轮计数一致；本change没有增加console过滤。renderer warning owner仅为 `ApplicationEditPageUiCustomization` 与 `RolePermissionEditPages`，根因属于optimizer module graph，不通过改写这两个测试处理。

## 5. 最终候选 top 15

以下分项来自任务自有 reporter。`collectMs`与`importSelfMs`反映每文件module graph开销；`testsBodyMs`反映suite内部累计测试体成本。数值不相加作为wall time，因为Vitest诊断阶段可能重叠。

### 5.1 默认顺序

| # | collect | setup | environment | import self | tests body |
| ---: | --- | --- | --- | --- | --- |
| 1 | ManagementPage.shell 2737.0ms | PlaywrightE2eToolchain 905.3ms | ServerStorePage 2354.0ms | ManagementPage.shell 3051.2ms | OrganizationDirectoryQualityPage 65208.1ms |
| 2 | App 2176.1ms | Antd5ModalOpen 810.0ms | PlaywrightE2eToolchain 2269.4ms | NavItemTree 2612.5ms | ApplicationEditPage 23753.0ms |
| 3 | NavItemTree 1909.4ms | NavItemTree 733.4ms | WorkspaceTabs 2193.0ms | App 2481.8ms | ApplicationUsageAccessPage 20939.6ms |
| 4 | LoginPage 1447.3ms | WorkspaceTabs 688.7ms | organizationDirectorySourceStatus 2051.5ms | LoginPage 1842.5ms | OrganizationTreeOperationsPage 20049.3ms |
| 5 | ServerStorePage 1398.4ms | identityAccessWizard 654.4ms | NavItemTree 1939.5ms | Antd5ModalOpen 1802.7ms | WecomOrganizationSyncPage 19314.2ms |
| 6 | UserEditPage 1376.9ms | organizationDirectorySourceStatus 597.9ms | RuleTable 1831.0ms | organizationDirectorySourceStatus 1784.5ms | FeishuOrganizationSyncPage 18887.7ms |
| 7 | SystemToolsMenuPages 1328.2ms | ListPageTable 536.7ms | OrganizationEditPage 1760.0ms | ServerStorePage 1751.8ms | ApplicationEditPageUiCustomization 11596.9ms |
| 8 | OrganizationDirectoryQualityPage 1323.9ms | UserListPage 532.7ms | Antd5ModalOpen 1740.8ms | OrganizationDirectoryQualityPage 1677.7ms | PlatformApiMappingPage 11133.5ms |
| 9 | PlatformApiMappingPage 1259.2ms | identityGovernanceTasks 511.8ms | OrderPages 1701.2ms | SystemToolsMenuPages 1668.0ms | AuditOperationsListPages 10848.5ms |
| 10 | PlanPricingSubscriptionPages 1247.0ms | AdapterPages 497.7ms | SyncerEditPage 1687.2ms | UserListPage 1656.9ms | ApplicationAccessMenuPages 8125.0ms |
| 11 | UserListPage 1214.0ms | KeyEditPage 495.0ms | SyncerListPage 1654.4ms | SyncerListPage 1615.7ms | DingTalkOrganizationSyncPage 7200.2ms |
| 12 | organizationDirectorySourceStatus 1213.6ms | IdentityEvidenceChainPage 484.0ms | IdentityEvidenceChainPage 1608.3ms | UserEditPage 1601.7ms | SystemToolsMenuPages 7152.7ms |
| 13 | ApplicationUsageAccessPage 1211.9ms | ApplicationAccessMenuPages 473.9ms | identityAccessWizard 1605.6ms | PlatformApiMappingPage 1571.3ms | OrganizationEditPage 6655.2ms |
| 14 | SyncerListPage 1194.0ms | WecomOrganizationSyncPage 464.8ms | SiteListPage 1531.3ms | IdentityEvidenceChainPage 1568.9ms | CertEditPage 5621.6ms |
| 15 | SignupPage 1191.7ms | Setting 460.6ms | WecomOrganizationSyncBackend 1518.1ms | ApplicationAccessMenuPages 1553.5ms | UserEditPage 4876.2ms |

### 5.2 file-only shuffle（seed `20260720`）

| # | collect | setup | environment | import self | tests body |
| ---: | --- | --- | --- | --- | --- |
| 1 | ManagementPage.shell 2629.7ms | AccountTable 645.7ms | RecordListPage 1572.4ms | ManagementPage.shell 2912.9ms | OrganizationDirectoryQualityPage 61341.6ms |
| 2 | App 2056.0ms | RecordListPage 569.6ms | identityEvidenceChain 1537.7ms | App 2378.7ms | ApplicationEditPage 26620.9ms |
| 3 | SyncerEditPage 1445.3ms | identityEvidenceChain 509.9ms | LargeEditFormLayout 1514.7ms | AccountTable 1977.7ms | ApplicationUsageAccessPage 24852.0ms |
| 4 | OrganizationEditPage 1412.0ms | SyncerEditPage 484.9ms | AccountTable 1509.1ms | SyncerEditPage 1813.4ms | FeishuOrganizationSyncPage 20668.5ms |
| 5 | AccountTable 1372.7ms | DingTalkOrganizationSyncPage 470.0ms | SyncerEditPage 1506.4ms | OrganizationEditPage 1715.4ms | OrganizationTreeOperationsPage 19428.0ms |
| 6 | AuditOperationsListPages 1259.4ms | FeishuOrganizationSyncBackend 465.6ms | resizeObserverLoopErrorPreflight 1486.4ms | AuditOperationsListPages 1625.9ms | WecomOrganizationSyncPage 17270.8ms |
| 7 | SignupPage 1139.4ms | LarkProviderGuide 455.5ms | LarkProviderGuide 1465.9ms | SignupPage 1505.0ms | DingTalkOrganizationSyncPage 12929.1ms |
| 8 | ApplicationEditPage 1125.4ms | LoginPageVisibility 452.4ms | OrganizationTreeOperationsBackend 1442.0ms | SystemToolsMenuPages 1478.5ms | AuditOperationsListPages 10864.7ms |
| 9 | ApplicationUsageAccessPage 1113.2ms | EnterpriseTlsPolicyFields 448.0ms | ProductCatalogPages 1441.2ms | ApplicationEditPage 1471.6ms | ApplicationEditPageUiCustomization 10146.3ms |
| 10 | SystemToolsMenuPages 1109.5ms | AuditOperationsCenter 446.2ms | OAuthProviderFields 1434.0ms | DingTalkOrganizationSyncPage 1451.1ms | PlatformApiMappingPage 8389.2ms |
| 11 | LargeEditFormLayout 1088.4ms | ApplicationEditPage 445.9ms | CertListPage 1433.5ms | AccessWizardPage 1442.2ms | ApplicationAccessMenuPages 7248.1ms |
| 12 | FeishuOrganizationSyncPage 1086.0ms | EnforcerListPage 442.3ms | FeishuOrganizationSyncPage 1414.1ms | auth/Provider 1424.8ms | OrganizationEditPage 7114.6ms |
| 13 | LoginPage 1067.6ms | TourConfig 439.6ms | LoginPageVisibility 1405.8ms | LargeEditFormLayout 1421.3ms | SystemToolsMenuPages 6315.7ms |
| 14 | RolePermissionEditPages 1064.1ms | identityAssetRelationship 438.5ms | EnterpriseTlsPolicyFields 1401.6ms | PlatformApiMappingPage 1418.6ms | UserEditPage 5094.6ms |
| 15 | AccessWizardPage 1059.8ms | supportedLocales 432.0ms | AuditOperationsListPages 1398.4ms | FeishuOrganizationSyncPage 1413.5ms | CertEditPage 4823.3ms |

文件名省略固定 `src/` 前缀与 `.test.ts[x]` 后缀以控制表宽；profiling期间完整module id保存在任务自有 `%TEMP%` JSON，设计提交前已清理，未提交仓库。

## 6. owner inventory 与分类

### 6.1 timeout 与 `>=4s` 单 test

最终exclude候选两轮均无 timeout。

| 轮次 | 文件 | case | 时长 | 分类 |
| --- | --- | --- | ---: | --- |
| 默认 | `OrganizationDirectoryQualityPage.test.tsx` | `shows empty operator note persistence readiness without writes` | 4113ms | tests-body；重型页面多分支/DOM交互 |
| shuffle | 同文件 | `opens sanitized operator note audit search without writes` | 4710ms | tests-body；接近timeout且顺序敏感 |
| shuffle | 同文件 | `fails closed on approval packet operator notes errors` | 4229ms | tests-body；错误分支重型render |
| shuffle | `ApplicationUsageAccessPage.test.tsx` | `requires an explicit target and locks the selector while generating a package` | 4142ms | tests-body；异步用户流与重型render |

补充历史边界：include-only默认轮的 `SyncerEditPage.test.tsx` 有一个4153ms case，而最终exclude轮未达4秒；上一change的正式候选曾让 `OrganizationTreeOperationsPage.test.tsx` 一个case在5032ms timeout，本轮同case为2743ms/2234ms。两者说明存在顺序/系统抖动，但不证明当前需要立即改写。

### 6.2 分类结论

- **真实测试体成本**：`OrganizationDirectoryQualityPage`、`ApplicationUsageAccessPage`；可在复现timeout后用拆分mega-flow、减少重复render、明确等待条件稳定化。
- **历史/抖动观察 owner**：`SyncerEditPage`、`OrganizationTreeOperationsPage`；仅因历史接近/超过5秒进入条件写集，不在未复现时修改。
- **module graph owner**：`ApplicationEditPageUiCustomization`、`RolePermissionEditPages`；renderer warning由optimizer内嵌ReactDOM造成，已由 `exclude=["react-dom"]` 修复，测试文件不得为此改写。
- **普遍每文件成本**：setup/environment在约1.3至2.4秒范围内分散，说明仍有jsdom与文件隔离固定开销；本change不通过弱隔离处理。
- **累计重型suite**：OrganizationDirectoryQuality、ApplicationEdit、ApplicationUsageAccess、OrganizationTreeOperations、三类组织同步页长期占tests-body top；只有出现默认timeout且命中条件写集才允许治理，其余top suite拆独立change。

条件式实施owner上限固定为4：

1. `web-admin/src/OrganizationDirectoryQualityPage.test.tsx`
2. `web-admin/src/ApplicationUsageAccessPage.test.tsx`
3. `web-admin/src/SyncerEditPage.test.tsx`
4. `web-admin/src/OrganizationTreeOperationsPage.test.tsx`

第5个timeout owner、新依赖、production修改、mock/interop/singleton/renderer回归或coverage不完整均fail-closed，不扩大写集。

## 7. mock、subpath 与 singleton 专项

以下均使用最终“ESM optimizer include + `react-dom` exclude”候选身份：

| 专项 | 结果 | Duration | warning结论 |
| --- | --- | ---: | --- |
| renderer focused默认 | 2 files / 29 tests | 17.44s | renderer/act/unhandled=0 |
| renderer focused反序 | 2 files / 29 tests | 16.96s | renderer/act/unhandled=0 |
| `vi.mock("antd") + vi.importActual("antd")` 4 owner | 4 files / 76 tests | 21.60s | stderr为空 |
| `antd/es/*` subpath mock 6 owner | 6 files / 153 tests | 63.78s | renderer/act/unhandled=0；既有pseudo可见 |
| App/Modal/WorkspaceTabs/WeComLoginPanel默认 | 4 files / 41 tests | 16.00s | renderer/act/unhandled=0 |
| 同组合file-only shuffle | 4 files / 41 tests | 16.40s | renderer/act/unhandled=0 |
| icons `setTwoToneColor` A→B sentinel | 2 files / 2 tests | 3.85s | 无跨文件值泄漏 |
| icons sentinel B→A自定义sequencer | 2 files / 2 tests | 4.65s | 无跨文件值泄漏 |

反序sentinel首次临时配置把sequencer文件路径字符串传给Vitest，Vitest 4.1.10实际要求constructor，产生 `Sequencer is not a constructor`，该无效轮不作为候选证据。ignored配置改为直接传入 `BaseSequencer` 子类后，B→A有效轮2/2通过；tracked代码未受影响。

## 8. API只读对照

只读参考 `aicodex-api@bd9531a`，没有修改、提交或清理API workspace。

- 可复用：Bun单一脚本入口、显式Vitest API、typed config/setup、直接配置契约。
- 不适用：API为Vitest 4.1.5/Vite 7.3.2/jsdom 26，使用`globals=true`、默认并行、普通/coverage timeout 15s/60s和全局ReactDOM mock；Admin保持4.1.10、5秒、`globals=false`、single-worker强隔离。
- API的顶层`optimizeDeps`服务production dev/build，不是`test.deps.optimizer.client`，不构成Admin性能证据。
- API coverage reporters、范围与threshold服务另一套production边界，不复制到Admin。

## 9. 证据限制与实施门禁

- 设计阶段只完成一次最终默认与一次最终shuffle；实施阶段仍必须完成两次连续默认与一次固定shuffle。
- 当前完整轮为warm optimizer cache，不承诺冷CI绝对wall；若实施阶段能观察真实CI，只记录为后续基线。
- 本阶段没有运行最终候选coverage；实施阶段必须一次性验证 `<=1800s`、四类reporter与382 production entries。
- profiling reporter仅用于阶段分项，不进入公共config；公共runner保持non-silent默认reporter。
- 原始日志、JSON、cache、sentinel与机器路径不提交；任务自有ignored profiler/cache和 `%TEMP%` 原始证据已在提炼后清理，归档证据只保留脱敏数字、分类和可复核配置身份。
