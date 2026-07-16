# 验证记录

## 当前结论

- 状态：pre-implementation review与pre-archive review均为`READY`；依赖升级、11处机械迁移、覆盖率、完整质量门禁与真实Chromium UI review均已完成，可以进入sync-specs归档与self-closeout。
- 实施候选：精确 `antd 5.29.3`，依据 npm `latest-5` 维护标签、官方5.25.0 API引入点和5.29.3实际类型/peer；最终可交付性仍以本仓库完整门禁与浏览器smoke为准。
- 环境：Windows、Node 24.14.0、Yarn 1.22.22；报告不记录registry endpoint、私有URL、凭据或raw config。

## 官方版本证据

| 来源 | 证据与判断 |
| --- | --- |
| [AntD 5.25.0 changelog](https://github.com/ant-design/ant-design/blob/5.25.0/CHANGELOG.en-US.md) | `destroy*` API被弃用并统一到`destroyOnHidden`；5.24.9对应changelog没有该项。 |
| [Modal 5.25.0 API](https://github.com/ant-design/ant-design/blob/5.25.0/components/modal/index.en-US.md) | `destroyOnHidden`标注版本5.25.0，说明关闭后卸载child components；5.24.9只列`destroyOnClose`。 |
| [Drawer 5.25.0 API](https://github.com/ant-design/ant-design/blob/5.25.0/components/drawer/index.en-US.md) | `destroyOnHidden`标注版本5.25.0，旧prop被标为deprecated。 |
| [AntD PR #53739](https://github.com/ant-design/ant-design/pull/53739) | `Unified destroyOnHidden API`，已merged/closed；与本change为相同功能根因。 |
| npm官方registry | 2026-07-17查询`latest=6.5.1`、`latest-5=5.29.3`；5.29.3是当前维护5.x信号，AntD6排除。 |
| npm tarball类型/peer | 5.25.4与5.29.3均声明Modal/Drawer `destroyOnHidden?: boolean`，旧prop deprecated；React/ReactDOM peer均为`>=16.9.0`。 |

5.24.1→5.29.3 的 AntD直接依赖约束有20项变化，主要涉及rc-*次版本/patch；npm解压体积由47,792,766 B增至48,376,800 B（约+1.2%）。这只是候选包影响面，不代表应用bundle变化。

## 升级前仓库基线

| 命令/检查 | 结果 |
| --- | --- |
| `git fetch origin --prune` + `git pull --ff-only origin hfl-test-base` | 通过；开工基线`d74e1bf0`，workspace clean，active changes为空。 |
| package/lock/actual/type审计 | `package.json`、`yarn.lock`、实际安装均为5.24.1；Modal类型无`destroyOnHidden`。 |
| `rg`生产TS/TSX | `destroyOnClose=11`、`destroyOnHidden=0`；owner与proposal矩阵一致。 |
| `yarn build` | 通过；5296 modules，`build/assets=8,968,150 B`。 |
| bundle关键chunk | ManagementPage 2,938,460 B、browser external 802,001 B、FaceRecognitionModal 650,295 B、jsx-runtime 577,872 B、ProviderBackend 559,904 B、index 482,423 B。 |
| build warning | 既有三类：face-api `fs` browser external、`Setting.tsx` direct eval、>500 kB chunk；后续比较新增/消失/变化。 |
| `yarn test:e2e:list` | 通过；19 files / 22 tests。 |
| 临时卫生 | 升级前build的177个文件已删除；正式workspace仍clean。 |

## 证据层级与待执行门禁

- 当前只证明官方版本边界、仓库基线和候选可行性；未声称5.29.3已被采用或完整兼容。
- 实施后必须补：RED/GREEN、frozen install/why/actual、聚焦与全量Jest、changed production coverage、三类typecheck、增量TS、lint、public scripts、Vite build、19/22 discovery、bundle/warning对比和production preview Chromium smoke。
- 浏览器只使用脱敏fixture/mock media，不连接60、真实摄像头、真实账号或企业凭据，不把本地UI验证表述为真实认证/企业集成E2E。

## 剩余风险

- 5.29.3包含20项rc-*直接约束变化，可能在目标prop之外暴露既有类型/渲染问题；若需要扩大到写集外组件或依赖，停止并回传主控。
- JSDOM不能完整证明关闭动画与焦点时序，必须由真实Chromium production preview补齐。

## Pre-implementation review

- 结论：`READY`，本次审查范围内未发现Blocking或Decision Needed。
- 已修复：proposal补齐peer/type/build影响；Face upload矩阵改为不承诺父state自动重置；WeCom history spec移除非强制`MAY`并明确父缓存边界。
- OpenSpec：target strict与all changes strict均通过；既有`版本边界与验证保持 fail-closed` requirement标题精确匹配，MODIFIED block包含完整更新后的两个scenario。
- 文档卫生：协作文档以简体中文说明为主；保留的OpenSpec关键字、API/prop、命令和标准技术术语合理。`TBD`只出现在“归档后扫描/修复TBD”的任务描述中，不是模板残留；敏感值扫描为0。
- 非阻塞实现注意：5.29.3有20项rc-*约束变化；出现写集外阻断兼容问题时停止并回传，不自行扩大deprecated扫仓。

## TDD RED 与迁移前characterization

| 验证 | 结果 |
| --- | --- |
| `yarn typecheck`（新增type contract、AntD 5.24.1） | 预期RED，exit 2；只剩`ModalProps`和`DrawerProps`的`destroyOnHidden`不属于keyof两条错误，证明旧类型不支持目标prop。首跑额外的`test.each`夹具错误已先修复，未把测试错误当有效RED。 |
| contract Jest（旧生产源码） | 预期RED，1 suite失败；8个owner文件逐项收到旧prop计数1/1/1/2/1/1/1/3，合计11，`destroyOnHidden=0`。 |
| Captcha/Face、Identity、Session、WeCom characterization | 通过，4/4 suites、47/47 tests；覆盖fresh captcha、Face track stop/new stream、Face upload reopen model契约、Drawer DOM卸载/新selection、Session close清理、WeCom preview/history/detail重新加载。 |

characterization用于保护必须保持的既有生命周期，因此在旧prop下应通过；真正的RED由类型与11-owner迁移guard提供。测试未通过mock prop调用次数代替用户可观察行为。

## 依赖升级与锁审计

| 验证 | 结果 |
| --- | --- |
| `yarn add --exact antd@5.29.3` | 生成精确package/lock并更新本地依赖树；只有`antd`直接依赖从5.24.1变为5.29.3。 |
| `yarn install --frozen-lockfile` | 通过，exit 0；lock可重放且依赖树up-to-date。 |
| `yarn why antd` / `yarn list --pattern antd --depth=0` | 只解析hoisted `antd@5.29.3`；`antd-token-previewer`是既有不同包名，不构成双AntD版本。 |
| actual package/peer/type | 实际版本5.29.3；React/ReactDOM peer `>=16.9.0`；Modal/Drawer类型均声明`destroyOnHidden`并将旧prop标为deprecated。 |
| lock stanza审计 | 43个增删selector header，全部属于`antd`、`@ant-design/colors`、`@rc-component/qrcode/trigger`与20项已记录rc-*约束的解析变化；未修改其它直接依赖。 |

安装阶段仍输出仓库既有CodeMirror等peer warning和Node Yarn `url.parse()`deprecation；未出现AntD/React peer不满足warning。验证记录不包含registry endpoint。

## 最小实现与聚焦GREEN

| 验证 | 结果 |
| --- | --- |
| 11处owner实现 | IdentityAsset/Record/Session/Webhook四个Drawer、Captcha/Face四个Modal位置、WeCom三个Modal只将`destroyOnClose`机械替换为`destroyOnHidden`；handler、state、权限、文案和样式未变。 |
| 5.29.3直接兼容 | `rc-table`新增隐藏measure cell后，WeCom列标题查询限定到真实`thead th[scope='col']`；业务值、刷新次数和modal生命周期断言未放宽。 |
| WeCom聚焦 | `yarn test:ci --runTestsByPath src/WecomOrganizationSyncPage.test.tsx`通过，1/1 suite、26/26 tests。 |
| 聚焦组合 | contract、Captcha/Face、IdentityAsset、Record/Session/Webhook与WeCom共5/5 suites、57/57 tests通过；静默CI输出无新增console、act或AntD warning。 |
| 生产prop扫描 | `web-admin/src`生产TS/TSX为`destroyOnClose=0`、`destroyOnHidden=11`；11处全部属于proposal owner矩阵。 |
| 逃逸与测试卫生 | 新增diff未发现`any`、ignore、console suppression、skip或任意sleep；contract使用真实Modal/Drawer类型，不通过assertion伪造目标prop。 |
| changed production coverage | 最终聚焦5/5 suites、61/61 tests生成JSON；12条生产变更行（11条overlay prop与1条Site单位后缀）均不被Babel单独标记为可执行行，按与变更行重叠的唯一可执行statement统计为17/19（89.47%），达到85%门槛。未覆盖的Webhook Drawer整段render与Face camera分支由既有聚焦测试和真实Chromium smoke继续补充，不以字符串guard制造覆盖。 |

## 完整质量门禁与直接兼容修复

| 验证 | 结果 |
| --- | --- |
| 全量Jest首轮 | 真实运行153 suites / 1446 tests；145 suites、1435 tests通过，8 suites、11 tests失败。失败归为旧lock的`rc-notification→rc-util`解析、`rc-table`/Modal DOM语义节点复制和`SiteEditPage`单处新增`InputNumber.addonAfter` warning三类，未把失败样本计为通过。 |
| lock最小修复 | `rc-util@^5.20.1` selector从5.34.0 stanza移入现有5.44.4 stanza；`yarn install --frozen-lockfile --force`通过，实际`rc-notification/node_modules/rc-util=5.44.4`且根导出`useEvent`为函数；未新增直接依赖或resolution。 |
| 5.29.3测试兼容 | Application/Provider表格与DingTalk测试限定真实列头，Feishu限定close button role；断言内容未放宽。`SiteEditPage`单处`addonAfter`改为`suffix`并保持秒单位；8个失败suite聚焦复核后全部通过。 |
| 全量Jest最终 | `yarn test:ci`通过，153/153 suites、1446/1446 tests、0 failure，耗时381.56秒；只有既有FakeTimers原生timer清理提示，无AntD runtime/deprecation warning。 |
| TypeScript与lint | `yarn typecheck`、`typecheck:build-tooling`、`typecheck:e2e`、增量TypeScript gate和`yarn lint`全部exit 0；lint只保留既有`caniuse-lite`更新提示。 |
| public scripts | `public-scripts:check`、`public-scripts:build`、`public-scripts:smoke`全部通过，生成步骤未产生tracked diff。 |
| Vite production build | 通过，5535 modules；warning仍为既有face-api `fs` external、`Setting.tsx` direct eval与大chunk三类，无新增AntD warning。 |
| Playwright discovery | `yarn test:e2e:list`通过，保持19 files / 22 tests。 |

## Bundle同口径比较

- 升级前：5296 modules，`build/assets=8,968,150 B`。
- 升级后：5535 modules，`build/assets=9,097,249 B`，增加129,099 B（+1.44%）。
- 最大chunk：ManagementPage 2,969,547 B（基线2,938,460 B，约+31 KB）；browser external 857,670 B、FaceRecognitionModal 650,297 B、ProviderBackend 594,563 B、jsx-runtime 581,865 B、index 484,887 B。
- 变化与AntD/rc-*升级和模块数增加一致，没有无解释的大幅回退；warning类别未新增。

## 真实Chromium UI review

- 使用Vite production fixture build/preview和Playwright CLI真实Chromium；fixture、inline logo、captcha和`canvas.captureStream()` mock media均脱敏，不连接60、真实摄像头、账号、企业凭据或外部API。
- 1440px：Captcha请求1→2且重开输入为空；Face media请求1→2、track stop 0→2；Identity Drawer关闭后旧asset DOM卸载并只显示新asset；WeCom preview请求1→2且旧preview不残留。关闭后焦点回到各自触发按钮，页面overflow为0。
- 390px：Captcha/Face modal均为350px（left 20/right 370），Drawer为390px（left 0/right 390），WeCom modal为374px（left 8/right 382）；四类overlay页面overflow均为0。移动截图目视无裁切、重叠或不可见操作，宽表格保持容器内横向滚动。
- 最终会话console error=0、warning=0；4个静态请求均200，pageerror/requestfailed=0。首次会话仅因harness缺favicon产生404，已加入inline favicon并以全新会话复核为0，未使用ignore。
- `aicodex-admin-ui-review`结论：`READY`，未发现Blocking/Question。未运行axe；本change没有新增产品控件或依赖，键盘焦点/role由真实快照人工核对，后续如建立全局a11y基线应使用独立change。

## 临时卫生

- 已关闭Playwright会话和Vite preview；删除本任务production build、fixture harness、coverage、截图/快照/console输出与专用`output/playwright`子目录。
- 根`.playwright-cli`含既有用户产物，只精确删除本任务首次误写的两个文件，保留其余108项；仓库原有`web-admin/coverage`未删除或改写。

## 实施后OpenSpec与文档门禁

- `openspec validate upgrade-web-admin-antd5-and-migrate-modal-destroy-semantics --strict`通过。
- `openspec validate --changes --strict`通过，1/1 active change；`openspec validate --specs --strict`通过，51/51主规格。
- `git diff --check`通过；proposal/design/tasks/verification/delta specs/技术债基线均含中文且以LF结尾。
- 敏感值匹配为0；`TBD`/模板词只命中任务与verification对该审计词本身的说明，不是未完成占位。
- 禁改写集审计：`SignupPage*`、`admin/**`、`.github/workflows/**`均为0；根目录planning residue为0。
- pre-archive复核修正了DingTalk保存配置测试中一个未使用的`container`解构；聚焦用例12/12与`yarn typecheck`重新通过。最终diff中的生产修改均为目标prop或直接阻断兼容的显然替换，无需添加复述性注释；测试辅助函数不承载业务契约，未发现阻断级注释缺口。
- 主规格同步结果：sync-specs archive已更新`web-admin-antd5-deprecation-cleanup`的版本边界 requirement，并创建`web-admin-antd5-modal-destroy-semantics`主规格；归档后已将两份主规格的`Purpose`与既有`Space.Compact`版本上下文更新为5.29.3当前契约，清除自动生成的TBD，并复核中文与strict validation。
- closeout前fetch发现`origin/hfl-test-base`前进到`635ecaec`；单提交无冲突rebase后，新增基线只涉及Signup响应式实现/测试与其已归档规格，本change没有修改这些文件。追加运行目标生命周期、DingTalk和Signup共7/7 suites、74/74 tests，frozen install、app/build-tooling/E2E typecheck、增量TypeScript gate、production lint与Vite production build均通过。
- fresh typecheck曾发现pre-commit的`eslint --fix`误删contract测试的type-only import；保持RED证据后改用`import("antd").ModalProps/DrawerProps`内联类型。该写法仍使用真实AntD类型，未使用`any`/assertion/ignore；再次执行`eslint --fix`后内容保持，contract 10/10与app typecheck通过。
