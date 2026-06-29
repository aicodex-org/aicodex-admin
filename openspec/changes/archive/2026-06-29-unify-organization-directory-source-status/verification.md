## 验证记录

验证日期：2026-06-29。
验证分支：`codex/unify-organization-directory-source-status`。
验证说明：本文件只记录命令、路径、状态码、脱敏字段和环境别名，不记录真实环境入口、账号密码、Cookie、token、client secret、Provider secret、完整组织标识或原始外部 Provider payload。

### 自动化检查

- `openspec validate "unify-organization-directory-source-status" --strict`：通过。
- `openspec validate --changes --strict`：通过。
- `go test -count=1 ./object ./controllers ./routers -run "Test(OrganizationDirectorySourceStatusService|WecomOrganizationSyncConfigService|FeishuOrganizationSyncConfigService|OrganizationSyncConfigServiceGetSourceStatus|WecomOrganizationSyncServiceStartManualRun|FeishuOrganizationSyncServiceStartManualRun|WecomOrganizationScheduledSyncExecutor|FeishuOrganizationScheduledSyncExecutor|NewOrganizationDirectorySourceStatusResponse|NewWecomOrganizationSyncConfigResponse|ResolveWecomOrganizationSyncConfigTarget|NewFeishuOrganizationSyncConfigResponse|ResolveFeishuOrganizationSyncConfigTarget)"`：通过。
- `yarn test --watchAll=false --runTestsByPath src/organizationDirectorySourceStatus.test.ts src/WecomOrganizationSyncPage.test.tsx src/FeishuOrganizationSyncPage.test.tsx`：通过，3 个测试套件、60 个用例全部通过；存在项目既有 React 18 `ReactDOM.render`、jsdom `window.computedStyle` 和 `act(...)` 警告。
- `yarn typecheck`：通过。

聚焦后端测试覆盖：

- `available`、`owned`、`occupied`、`ambiguous` 和预留 `dingtalk` source status 分类。
- 保存、手动同步和定时同步执行前的 `source_occupied`、`source_ambiguous`、`source_status_unavailable` 拒绝路径。
- scheduler 在 occupied、ambiguous 和 unavailable source state 下跳过 dispatch 并记录安全 reason code。
- controller 响应形态不包含 Provider secret、access token、refresh token、Cookie 或原始 Provider payload。

聚焦前端测试覆盖：

- 共享 source status helper 的文案和禁用动作映射。
- WeCom 与 Feishu/Lark 页面在 occupied 组织上的提示、组织过滤和操作禁用。
- `ambiguous` 组织在已选中时保持可见，展示为数据异常，并保持保存/手动同步操作禁用。

### 本地运行态 smoke

本地 smoke 使用 `local-dev/start-windows-local-dev.ps1 restart` 启动当前 Go 后端和 React 前端，使用本地 dev profile。验证记录不保存本地账号、Cookie 或 token。

观察结果：

- 本地登录后，`GET /api/organization-directory-source-status?source=wecom&organization=built-in` 返回 HTTP 200。
- source status 响应包含预期状态字段，未出现 `accessToken`、`refreshToken`、`clientSecret`、`addressBookSecret`、`cookie` 等凭据字段名。
- Chrome headless CDP smoke 登录本地 dev 账号后加载 `/wecom-org-sync` 和 `/feishu-org-sync`，两个页面标题均渲染。

本地 smoke 首次请求曾返回 404，原因是新 controller 方法未注册到 `admin/routers/router.go`。已补充路由注册，重启本地 dev 后重新调用 API 验证为 HTTP 200。

### 60 环境部署与 smoke

部署范围：仅部署 Admin 工作分支到 60 环境 Admin 测试服务，未操作 69 正式环境或生产数据。

部署结果：

- 60 环境 Admin 已切换到 `codex/unify-organization-directory-source-status`，远端 HEAD 为本 change commit。
- 远端部署脚本完成镜像构建、容器重建和内置 health check。
- 容器状态为 healthy。
- 部署前旧后端访问 `/api/organization-directory-source-status` 返回 404；部署后该接口已存在。

登录态 API smoke：

- 未登录访问新接口返回业务未授权，但不是 404，说明路由已生效。
- 使用 60 环境测试账号登录后，`/api/login`、`/api/get-account` 和 `/api/organization-directory-source-status` 均返回业务 `ok`。
- 对 `source=wecom` 和 `source=feishu` 的查询均返回 HTTP 200 和业务 `ok`。
- 响应脱敏检查未发现 `secret`、`token`、`cookie`、`password` 等凭据字段名。
- 60 环境日志显示新接口鉴权 allow 和 HTTP 200，未见 `panic` 或 `fatal`；日志中存在测试环境证书域名预检查失败噪音，与本 change 无关。

60 页面验收：

- Feishu/Lark 同步页在新建测试组织上保存配置后提示保存成功；测试用 App ID/App Secret 为占位值，不记录真实值。
- 保存后该测试组织仍在 Feishu/Lark 页可见，符合“当前来源自己的组织可继续编辑”的预期。
- WeCom 同步页组织下拉不再显示该测试组织，说明前端过滤已排除被 Feishu/Lark 占用的组织。
- 既有 WeCom 组织仍在 WeCom 页可见，既有 Feishu/Lark 组织仍在 Feishu/Lark 页可见，未被错误过滤。

60 后端绕过 UI 负测：

- 直接调用统一状态 API 验证 `<feishu-owned-org>` 对 WeCom 返回 `state=occupied`、`owningSource.source=lark`。
- 直接调用统一状态 API 验证 `<wecom-owned-org>` 对 Feishu/Lark 返回 `state=occupied`、`owningSource.source=wecom`。
- 绕过前端直接 POST WeCom 配置到 `<feishu-owned-org>`，后端返回业务 `error`，错误语义为已被 Feishu/Lark 来源占用，需要新建组织后再配置。
- 绕过前端直接 POST Feishu/Lark 配置到 `<wecom-owned-org>`，后端返回业务 `error`，错误语义为已被 WeCom 来源占用，需要新建组织后再配置。
- 两次负测后再次查询统一状态，仍为 `occupied/lark` 和 `occupied/wecom`，未写成异常双配置。

### 仍需人工或后续 change 覆盖的内容

- 本轮 60 验收没有使用真实有效的飞书或企业微信凭据执行正式通讯录同步；占位凭据下“测试连接 / 开始同步”失败属于预期。
- 本轮没有在 60 环境创建异常双配置 fixture；异常双配置的 `ambiguous` 展示和 fail-closed 主要由自动化测试、本地 smoke 和后端统一判定覆盖。
- 本 change 不提供解除来源绑定或自动清理脏数据入口；如果真实组织已同步过数据，需要新建组织或后续数据治理 change 处理。
