## Why

`web-admin` 仍精确锁定 Ant Design 5.24.1，生产源码有 11 处已被上游替代的 `destroyOnClose`，而该版本类型不支持 `destroyOnHidden`。现在依赖锁已释放，需要升级到仍受官方 `latest-5` 维护的稳定 AntD 5 版本，并在真实类型与运行时下把关闭动画后的子树销毁、资源清理和重开重置语义迁移闭环。

## What Changes

- 将 `antd` 从 5.24.1 精确升级并锁定到 5.29.3：官方 5.25.0 changelog、Modal/Drawer API 与已合并的 [PR #53739](https://github.com/ant-design/ant-design/pull/53739) 证明 `destroyOnHidden` 自 5.25.0 提供；npm 官方 registry 当前将 5.29.3 标记为 `latest-5`，因此选择维护中的 5.x 稳定线，而不是停留在首个支持 minor 的旧 patch 5.25.4，也不升级 AntD 6。
- 使用 frozen Yarn install 更新唯一 `yarn.lock`，核对实际安装版本、peer/type 和锁树；React/ReactDOM peer 继续为 `>=16.9.0`，不升级 React、Router、Jest、Vite、Playwright、Bun 或其它无关直接依赖。
- 修正旧 lock selector 使 `rc-notification@5.6.4` 使用兼容的 `rc-util@5.44.4` 私有解析；不把 `rc-util` 新增为直接依赖或全局 resolution。
- 将 IdentityAsset、Record、Session、Webhook 四个 Drawer、Captcha/Face 四个 Modal 位置和 WeCom 三个 Modal 共 11 处 `destroyOnClose` 迁移为 `destroyOnHidden`；保持关闭动画结束后卸载、重开重置、媒体/interval cleanup、异步刷新和父级状态边界。
- 以 TDD 补充类型/prop guard 与关键 close-reopen 行为测试，运行 changed production coverage、全量 Jest/TypeScript/lint/public scripts/Vite/Playwright discovery，并用脱敏 Chromium fixture 验证 Captcha/Face、普通 Drawer 与 WeCom modal 的桌面/窄屏、焦点、资源和异步状态。
- 仅处理5.29.3完整门禁直接暴露的阻断兼容：表格measure/fixed header和Modal close结构的测试改查真实语义节点；`SiteEditPage`单处`InputNumber.addonAfter`改为类型原生支持的`suffix`以消除新增阻断warning。其它历史deprecated API不在本change扫仓。
- 更新技术债基线和既有 AntD 5 主规格的 5.24.1 defer 条款；不修改 SignupPage、认证行为、TLS Provider/Syncer、Go/schema、CI workflow、60 配置或 CRA/polyfill 已归档契约。

### 版本、peer/type 与 build 影响

- 5.29.3 与首个支持 minor 的末 patch 5.25.4 均保持 React/ReactDOM peer `>=16.9.0`，当前 React 18无需升级；两者的官方 npm 类型都把旧prop标为deprecated并声明`destroyOnHidden?: boolean`。
- 5.24.1→5.29.3 有20项 AntD直接rc-*约束变化，重点涉及drawer/trigger/table/tabs/upload等次版本；官方5.25→5.29 changelog区间未声明BREAKING条目，但仍必须由全量Jest、三类typecheck、Vite build和浏览器smoke验证，不预设兼容。
- 升级前同口径Vite build已通过，5296 modules、`build/assets=8,968,150 B`；既有warning为face-api `fs` browser external、`Setting.tsx` direct eval与大chunk。升级后必须比较总asset、关键chunk和warning类别，新增AntD warning或无解释的大幅回退不得归档。

### 11-owner 语义矩阵

| # | Owner / overlay | 必须保持的关闭与重开语义 |
| --- | --- | --- |
| 1 | `IdentityAssetRelationshipDrawer` / Drawer | 关闭动画后卸载详情 DOM；重开只渲染当前 asset，继续保持权限与脱敏边界。 |
| 2 | `CaptchaModal` / Modal | 关闭后清 token 并卸载 captcha/widget 子树；重开重新请求 captcha，不复用旧 token。 |
| 3 | `FaceRecognitionCommonModal` / Modal | 关闭停止 media tracks、清 interval/video；重开创建新的 media session。 |
| 4 | `FaceRecognitionModal` camera / Modal | 关闭停止 tracks/检测 interval并清捕获状态；重开不复用已结束 stream。 |
| 5 | `FaceRecognitionModal` upload / Modal | 关闭动画与子树卸载不改变模型 loading、文件选择和上传确认契约；不把 child销毁误写成父组件state自动重置。 |
| 6 | `RecordListPage` / Drawer | 关闭后卸载详情 DOM；重开渲染新选择的 record。 |
| 7 | `SessionListPage` / Drawer | 关闭清 record/index/Popconfirm 并卸载子树；重开不复用旧 session selection。 |
| 8 | `WebhookEventListPage` / Drawer | 关闭后卸载详情 DOM；重开渲染新选择的 event。 |
| 9 | `WecomOrganizationSyncPage` preview / Modal | 每次打开清旧 preview/error 并重新请求；关闭后卸载 preview 子树。 |
| 10 | `WecomOrganizationSyncPage` history / Modal | 每次打开重新 refresh history；关闭后卸载 table 子树，不伪造清空父级缓存。 |
| 11 | `WecomOrganizationSyncPage` history detail / Modal | 每次选择清旧 detail/error 并重新请求；关闭后卸载 detail 子树。 |

## Capabilities

### New Capabilities

- `web-admin-antd5-modal-destroy-semantics`: 定义 Admin 前端在维护中的 AntD 5 版本上使用 `destroyOnHidden` 时的 11-owner 生命周期、资源清理、验证与回滚契约。

### Modified Capabilities

- `web-admin-antd5-deprecation-cleanup`: 将原先固定 5.24.1、保留 11 处 `destroyOnClose` 的 fail-closed defer 条款更新为精确 5.29.3、生产 `destroyOnClose=0` / `destroyOnHidden=11`，其余 Input/overlay `open` 迁移语义不变。

## Impact

- 依赖：`web-admin/package.json`、`web-admin/yarn.lock` 中的 AntD 5 及其 rc-* 间接依赖；没有后端、API、schema 或运行时配置变化。
- 生产 owner：`IdentityAssetRelationshipDrawer.tsx`、`CaptchaModal.tsx`、`FaceRecognitionCommonModal.tsx`、`FaceRecognitionModal.tsx`、`RecordListPage.tsx`、`SessionListPage.tsx`、`WebhookEventListPage.tsx`、`WecomOrganizationSyncPage.tsx`；直接兼容修复另含`SiteEditPage.tsx`单处单位后缀。
- 测试与文档：上述 owner 的直接/局部测试，以及5.29.3强制影响的Application/Provider表格、DingTalk/Feishu组织同步测试、OpenSpec、技术债基线、脱敏浏览器与bundle/warning验证证据。
- 回滚：revert 单个最终 change commit 即可恢复 5.24.1 锁文件和旧 prop；不涉及数据迁移、真实凭据或服务重启。
