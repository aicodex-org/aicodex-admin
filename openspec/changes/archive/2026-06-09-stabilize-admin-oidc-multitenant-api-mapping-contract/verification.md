# 验证记录

验证日期：2026-06-08

## 已执行

- `go test ./object -run "Test(ApplicationOrganizationResolutionPolicyFailsClosed|DynamicClientRegistrationOrganizationResolutionMode|UserInfoUsesStableSubjectAndOrganizationContext|BuildPlatformApiMappingMigrationPlanUsesLegacyFieldsAsCandidatesOnly|BuildGatewayProjectionBatch)" -count=1 -timeout 120s -v`
  - 结果：通过。
  - 覆盖：application 组织解析 fail-closed、DCR 默认 organization-bound、userinfo 稳定 `sub/organization/client`、旧字段只生成迁移候选、gateway projection 只读一等 `PlatformApiUserMapping`。
- `go test ./controllers -run "Insight|PlatformApi|OAuth|WecomProfileConsent" -count=1 -timeout 120s`
  - 结果：通过。
  - 覆盖：Insight provider 运行时只读一等 `PlatformApiOrganizationMapping` / `PlatformApiUserMapping`、旧弱属性不参与运行时映射、mapping 管理 API 可编译、OAuth/同意页/企业微信资料授权相关路径未出现编译回归。
- `go test ./object -run TestNonExisting -count=0 -timeout 120s`
  - 结果：通过，确认 object 包当前可编译。
- `go test ./controllers -run TestNonExisting -count=0 -timeout 120s`
  - 结果：通过，确认 controllers 包当前可编译。
- `npm test -- --runInBand --watchAll=false PlatformApiMappingBackend.test.js AuthBackend.test.js Setting.test.js`
  - 结果：通过，3 个测试套件、12 个测试通过。
  - 覆盖：platform mapping 管理 API 调用、OAuth query 透传 `organization`、API path 白名单。
- `npm run build`
  - 结果：通过。
  - 备注：输出既有 Browserslist 过期提示和 bundle size 提示，未影响编译。
- `openspec validate "stabilize-admin-oidc-multitenant-api-mapping-contract" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- 脱敏扫描：
  - `rg '[0-9]{1,3}(\.[0-9]{1,3}){3}|client_secret|cookie|Cookie|Set-Cookie|Bearer [A-Za-z0-9]|password|refresh_token"\s*:|access_token"\s*:' openspec/changes/stabilize-admin-oidc-multitenant-api-mapping-contract -n`
  - `rg "https?://" openspec/changes/stabilize-admin-oidc-multitenant-api-mapping-contract -n`
  - 结果：只命中脱敏要求说明、验证记录中的 `Cookie` / `sha256` 占位描述和 `.invalid` synthetic 样例，未发现真实环境地址、内网 IP、token、cookie、账号或客户端密钥。

## 60 环境部署与运行态验证

验证时间：2026-06-08

### 部署

命令形态：

```powershell
git push -u origin hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract
ssh <deploy60-host> "cd <aicodex-admin-dir> && ./deploy-aicodex-admin.sh --branch hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract up"
```

结果：

- 60 测试环境远端代码目录成功切到 `hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract`。
- 远端部署提交为 `8d46efdd feat: 固化 admin OIDC 多租户 API 映射契约`。
- Docker 镜像 `fanley/aicodex-admin:test` 成功重建，`fanley-aicodex-admin` 容器重新创建。
- 脚本内健康检查 `GET <deploy60-admin-base-url>/` 返回通过，容器状态恢复 `healthy`。

### 公开 metadata 冒烟

请求：

- `GET <deploy60-admin-base-url>/`
- `GET <deploy60-admin-base-url>/.well-known/openid-configuration`
- `GET <deploy60-admin-base-url>/.well-known/app-built-in/openid-configuration`

结果：

- 首页返回 `200 text/html`。
- 全局 discovery 输出 `issuer`、`authorization_endpoint`、`token_endpoint`、`userinfo_endpoint`、`jwks_uri`。
- 全局 discovery 的 `claims_supported` 包含 `organization` 与 `client_id`。
- 全局 discovery 与 application-specific discovery 的 `issuer`、`jwks_uri`、`userinfo_endpoint` 一致。

### 登录态与 mapping 管理 API

验证方式：

- 使用 60 私有凭据登录 `POST /api/login`，Cookie 只保存在临时文件，验证结束后删除。
- 登录后调用：
  - `GET /api/get-account`
  - `GET /api/get-platform-api-organization-mappings?organization=built-in`
  - `GET /api/get-platform-api-user-mappings?organization=built-in`

结果：

- `POST /api/login` 返回 `status=ok`，且响应包含用户 ID 格式。
- `GET /api/get-account` 返回 `status=ok`，且响应包含当前主体。
- 两类 mapping 查询接口均返回 `status=ok`。
- 当前 `built-in` 下 organization/user mapping 数量均为 `0`，后续 mapping gate 负例基于该前置状态验证。

### shared application 与 mapping gate 运行态

验证方式：

- 创建临时 synthetic application：
  - 名称前缀：`tmp-oidc-mt-contract-*`
  - synthetic `clientId` / `clientSecret`
  - redirect URI 使用 `.invalid` 域名
  - `organizationResolutionMode=shared_application`
  - 初始 `allowedOrganizationStatus=PENDING_REVIEW`
- 验证后删除临时 application，并确认 `GET /api/get-application?id=admin/<temporary-app>` 返回空数据。

请求与结果：

- `GET /api/get-app-login` 不带 `organization`：返回 `status=error`，shared application 缺少目标组织时 fail-closed。
- `GET /api/get-app-login` 带 `organization=built-in` 但 allowed policy 未确认：返回 `status=error`。
- 将临时 application 更新为 `allowedOrganizations=["built-in"]`、`allowedOrganizationStatus=CONFIRMED`、`apiMappingRequired=true` 后，`GET /api/get-app-login` 带 `organization=built-in` 返回 `status=ok`。
- 同一临时 application 带未授权 `organization`：返回 `status=error`。
- `POST /api/login/oauth/access_token` 使用 password grant，在缺少 confirmed platform API mapping 时返回 OAuth `invalid_grant`，错误描述指向 mapping 缺失。
- 临时 application 删除成功，清理确认通过。

说明：

- 首轮临时验证曾因请求只带 `type=code`、未带 `responseType=code` 导致 `get-app-login` 进入 OAuth 分支后 response type 为空，被拒绝为 unsupported grant type；按接口契约补充 `responseType=code` 后重跑通过。

### token claim 运行态

验证方式：

- 创建临时 synthetic shared application：
  - `allowedOrganizations=["built-in"]`
  - `allowedOrganizationStatus=CONFIRMED`
  - `apiMappingRequired=false`
- 通过 `POST /api/login/oauth/access_token` 使用 password grant 签发一次临时 token。
- 本地只解析 JWT payload 做 claim 断言，不在记录中保存 token 原文。
- 通过 token 管理 API 找到该临时 token 并删除；再删除临时 application。

结果：

- token 成功签发。
- `iss` 等于当前 60 admin base URL。
- `sub` 非空。
- `aud` 包含 synthetic `clientId`，且不包含 `built-in` 组织名。
- `azp` 等于 synthetic `clientId`。
- `client_id` 等于 synthetic `clientId`。
- `organization` 等于本次目标组织 `built-in`。
- `tokenType` 等于 `access-token`。
- 临时 token 对象可找到并删除，二次查询确认无残留。
- 临时 application 删除成功。

### 审计日志脱敏

验证方式：

```bash
docker logs fanley-aicodex-admin --since 20m 2>&1 | grep -E "application_organization_resolution_audit|platform_api_mapping_gate_audit|platform_api_mapping_audit"
```

结果：

- 能看到 `application_organization_resolution_audit`：
  - `SHARED_ORGANIZATION_REQUIRED`
  - `SHARED_ORGANIZATION_POLICY_UNCONFIRMED`
  - `SHARED_ORGANIZATION_DENIED`
- 能看到 `platform_api_mapping_gate_audit`：
  - `ORGANIZATION_MAPPING_MISSING`
- 日志只记录 application/client/organization 诊断字段和 `adminSubjectHash=sha256:*`，未记录 token、cookie、密码、明文账号或映射值。

## 未执行

- 未在真实或测试 `aicodex-api` 环境做 OIDC 端到端联调。
- 未执行全量 `go test ./...`；本次执行了 object/controllers 编译检查、object/controllers 聚焦测试、前端单测和前端 build。

## 归档前复查补充

复查时间：2026-06-08

复查发现并修复一个 fail-closed 缺口：shared application 已配置 `allowedOrganizations` 但 `allowedOrganizationStatus` 为空时，授权入口不应视为已确认策略。最终实现已收紧为必须显式 `CONFIRMED` 才允许 shared application 继续登录；空状态会被标准化为 `PENDING_REVIEW` 并拒绝。

已重新执行：

- `go test ./object -run "TestApplicationOrganizationResolutionPolicyFailsClosed|TestDynamicClientRegistrationOrganizationResolutionMode|TestUserInfoUsesStableSubjectAndOrganizationContext|TestBuildPlatformApiMappingMigrationPlanUsesLegacyFieldsAsCandidatesOnly" -count=1 -timeout 120s -v`
  - 结果：通过。
  - 覆盖：shared application 缺少 confirmed allowed policy、缺少 organization、organization 越权、organization-bound 覆盖拒绝、DCR 默认 organization-bound、userinfo 稳定主体语义、旧字段只作为迁移候选。
- `go test ./controllers -run "Insight|PlatformApi|OAuth|WecomProfileConsent" -count=1 -timeout 120s`
  - 结果：通过。
  - 覆盖：Insight provider、platform mapping API、OAuth 相关路径和企业微信资料授权路径未出现编译或聚焦测试回归。
- `npm test -- --runInBand --watchAll=false PlatformApiMappingBackend.test.js AuthBackend.test.js Setting.test.js`
  - 结果：通过，3 个测试套件、12 个测试通过。
  - 覆盖：platform mapping 前端 API 调用、OAuth query 透传 `organization`、API path 白名单。
- `openspec validate "stabilize-admin-oidc-multitenant-api-mapping-contract" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- 脱敏复查：
  - `rg '\b[0-9]{1,3}(\.[0-9]{1,3}){3}\b' openspec/changes/stabilize-admin-oidc-multitenant-api-mapping-contract -n`
  - `rg 'client_secret|Cookie|Set-Cookie|Bearer [A-Za-z0-9]|password|refresh_token"\s*:|access_token"\s*:' openspec/changes/stabilize-admin-oidc-multitenant-api-mapping-contract -n`
  - `rg 'https?://' openspec/changes/stabilize-admin-oidc-multitenant-api-mapping-contract -n`
  - 结果：未命中真实 IPv4；敏感词命中均为脱敏规则说明、`Cookie` 临时文件描述或 endpoint path；URL 命中均为 `.invalid` synthetic 样例，未发现真实环境地址、内网 IP、token、cookie、账号或客户端密钥。

## 运维指导文档补充

补充时间：2026-06-08

新增文档位置：

- GitLab 项目 `aicodex/aicodex-docs`：`docs/ops/aicodex-admin-api-tenant-mapping-ops.md`
- GitLab 项目 `aicodex/aicodex-docs`：`docs/ops/index.md` 增加导航入口

覆盖内容：

- `管理工具 -> API 网关映射` 页面操作流程
- `organizationId`、`apiOrganizationId`、`adminSubject`、`apiUserId`、`mappingStatus`、`mappingSource`、`lineage` 字段来源
- 首次接入组织、用户映射、迁移候选、暂停用户、API 侧 ID 变更等运维场景
- OIDC gate 验证、日志排障、状态规则、API 端点参考和安全注意事项

已执行：

- `openspec validate "stabilize-admin-oidc-multitenant-api-mapping-contract" --strict`
  - 结果：通过。
- 在 `aicodex-docs` 仓库执行 `rg -n "\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b" docs/ops/aicodex-admin-api-tenant-mapping-ops.md docs/ops/index.md`
  - 结果：未命中 IPv4 地址。
- 在 `aicodex-docs` 仓库执行 `rg -n "token|cookie|密码|Client Secret|access_token|refresh_token|id_token|leagsoft|wwe7" docs/ops/aicodex-admin-api-tenant-mapping-ops.md docs/ops/index.md`
  - 结果：命中均为安全注意事项、脱敏要求或通用 token 字段名，未发现真实 token、cookie、密码、账号、真实域名或客户端密钥。
- 在 `aicodex-docs` 仓库执行 `rg -n "https?://|[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}" docs/ops/aicodex-admin-api-tenant-mapping-ops.md`
  - 结果：未命中 URL 或 JWT 形态字符串。

## 菜单命名调整补充

补充时间：2026-06-08

调整内容：

- 后台菜单从 `API 租户映射` 调整为 `API 网关映射`。
- 页面标题调整为 `AICodex API 组织与账号映射`。
- 页面说明调整为认证中心组织/账号到 `aicodex-api` 业务组织、网关账号和用量身份的权威映射。
- 集中 docs 运维文档同步使用 `API 网关映射` 页面名称。

已执行：

- `npm test -- --runInBand --watchAll=false PlatformApiMappingBackend.test.js AuthBackend.test.js Setting.test.js`
  - 结果：通过，3 个测试套件、12 个测试通过。
- `openspec validate "stabilize-admin-oidc-multitenant-api-mapping-contract" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- 在 `aicodex-docs` 仓库执行 `git diff --check`
  - 结果：通过。
- 在 `aicodex-docs` 仓库执行 `rg -n "API 租户映射|\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b|https?://|[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}" docs/ops/aicodex-admin-api-tenant-mapping-ops.md docs/ops/index.md`
  - 结果：未命中旧菜单名、IPv4、URL 或 JWT 形态字符串。
- 在 `aicodex-docs` 仓库执行 `rg -n "token|cookie|密码|Client Secret|access_token|refresh_token|id_token|leagsoft|wwe7" docs/ops/aicodex-admin-api-tenant-mapping-ops.md docs/ops/index.md`
  - 结果：命中均为安全注意事项、脱敏要求或通用 token 字段名，未发现真实 token、cookie、密码、账号、真实域名或客户端密钥。

## 60 环境最终更新验证

验证时间：2026-06-08

推送结果：

- `aicodex-admin` 分支 `hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract` 已推送到远端提交 `1bcd4864`。
- `aicodex-docs` 分支 `dev` 已推送到远端提交 `e0049ba`。

部署方式：

```bash
ssh <deploy60-host> "cd <aicodex-admin-dir> && ./deploy-aicodex-admin.sh --branch hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract up"
```

部署结果：

- 60 环境远端代码从 `0ab9b932` fast-forward 到 `1bcd4864`。
- Docker 镜像 `fanley/aicodex-admin:test` 构建成功。
- `fanley-aicodex-admin` 容器重建成功。
- 部署脚本内置健康检查通过。

脱敏 HTTP 冒烟结果：

- `GET <deploy60-admin-base-url>/` 返回 `200`。
- `GET <deploy60-admin-base-url>/.well-known/openid-configuration` 返回 `200`，且 `issuer` 非空。
- `GET <deploy60-admin-base-url>/.well-known/app-built-in/openid-configuration` 返回 `200`，且 `issuer` 非空。
- 已通过外部 HTTP 拉取 60 容器暴露的前端 JS 静态资源，确认包含 `platform-api-mapping` 路由 chunk。
- 生产 JS 中中文文案会被转为 `\u...` escape；已按 escape 形式确认新菜单 `API 网关映射` 和页面标题 `AICodex API 组织与账号映射` 已进入 60 静态资源。
- 已确认旧菜单名 `API 租户映射` 不再出现在 60 前端静态资源中。

## 页面可用性中文化补充

补充时间：2026-06-08

调整内容：

- `API 网关映射` 页面表头主文案改为运维可读中文，`organizationId`、`apiOrganizationId`、`adminSubject`、`apiUserId`、`mappingStatus`、`mappingSource`、`lineage` 等技术字段移入问号说明。
- `mappingStatus` 下拉显示 `已确认`、`待复核`、`冲突`、`重复`、`已停用`，保存时仍提交 `CONFIRMED`、`PENDING_REVIEW`、`CONFLICTED`、`DUPLICATE`、`DISABLED`。
- `mappingSource` 从自由输入改为下拉显示 `手工维护`、`迁移导入`、`解析器生成`，保存时仍提交 `MANUAL`、`MIGRATION`、`RESOLVER`。
- 页面提示语将 `CONFIRMED`、`userinfo`、`Insight provider`、`gateway projection` 等英文主描述改为中文说明，保留必要技术字段在 tips 中解释。

已执行：

- `npm test -- --runInBand --watchAll=false PlatformApiMappingPage.test.js`
  - 结果：通过，1 个测试套件、1 个测试通过。
  - 覆盖：页面显示中文状态/来源标签，表头不再直接暴露 `mappingStatus` / `mappingSource`，保存时仍提交原始枚举值。
- `npm test -- --runInBand --watchAll=false PlatformApiMappingPage.test.js PlatformApiMappingBackend.test.js AuthBackend.test.js Setting.test.js`
  - 结果：通过，4 个测试套件、13 个测试通过。
- `npm run build`
  - 结果：通过。
  - 备注：输出中仍有项目既有 Browserslist 过期、包体积较大和 React 测试 legacy render 警告；本次未处理这些既有问题。

### 60 环境页面验证

部署提交：`df490191`

部署方式：

```bash
ssh <deploy60-host> "cd <aicodex-admin-dir> && ./deploy-aicodex-admin.sh --branch hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract up"
```

部署结果：

- 60 环境远端代码从 `e895dccb` fast-forward 到 `df490191`。
- Docker 镜像 `fanley/aicodex-admin:test` 构建成功。
- `fanley-aicodex-admin` 容器重建成功。
- 部署脚本内置健康检查通过。

浏览器验证：

- 使用浏览器会话打开 `<deploy60-admin-base-url>/platform-api-mappings`。
- 页面进入 `API 网关映射`，主标题显示 `AICodex API 组织与账号映射`。
- 表头主文案显示 `映射状态`、`映射来源`，不再显示 `映射状态（mappingStatus）`、`映射来源（mappingSource）`。
- 当前测试组织无已有映射数据；点击 `组织映射 -> 添加` 生成未保存新行后，页面显示 `待复核`、`手工维护`。
- 主页面文本不再直接显示 `PENDING_REVIEW` 或 `MANUAL`。
- 本次浏览器验证未保存新映射，不改动 60 测试数据。

## `lineage` 系统维护可用性补充

补充时间：2026-06-08

调整内容：

- `API 网关映射` 页面主表不再显示 `血缘信息` 列，也不再让运维手写 `{}` 或其它 JSON。
- 新增组织/用户映射保存时，如果 `lineage` 为空或 `{}`，后端自动写入脱敏系统血缘：`source=admin-console`、`action=manual-update`、`reason=operator-maintained`、`version=1`。
- 已有迁移血缘或非空诊断血缘不覆盖，避免丢失迁移候选来源。
- 集中 docs 运维文档同步改为“`lineage` 由系统维护，常规运维不填写 JSON”。

已执行：

- `go test ./object -run "TestSavePlatformApi(Organization|User)Mapping|TestBuildPlatformApiMappingMigrationPlanUsesLegacyFieldsAsCandidatesOnly|TestApplicationOrganizationResolutionPolicyFailsClosed|TestDynamicClientRegistrationOrganizationResolutionMode|TestUserInfoUsesStableSubjectAndOrganizationContext" -count=1 -timeout 120s -v`
  - 结果：通过。
  - 覆盖：organization/user 空血缘自动生成、已有 user 迁移血缘不覆盖、既有多租户映射契约测试仍通过。
- `npm test -- --runInBand --watchAll=false PlatformApiMappingPage.test.js PlatformApiMappingBackend.test.js AuthBackend.test.js Setting.test.js`
  - 结果：通过，4 个测试套件、13 个测试通过。
  - 覆盖：页面不再显示 `血缘信息` 和 `{}` JSON 输入，状态/来源仍以中文展示并保存原始枚举值。
- `npm run build`
  - 结果：通过。
  - 备注：输出中仍有项目既有 Browserslist 过期、包体积较大和 Node deprecation 警告；本次未处理这些既有问题。
- `openspec validate "stabilize-admin-oidc-multitenant-api-mapping-contract" --strict`
  - 结果：通过。
- `git diff --check`
  - `aicodex-admin` 仓库结果：通过。
  - `aicodex-docs` 仓库结果：通过。
- `rg -n "ops-ticket|initial-api-onboarding|initial-user-link|token|cookie|password|secret|https?://|\b\d{1,3}(?:\.\d{1,3}){3}\b" docs/ops/aicodex-admin-api-tenant-mapping-ops.md -S`
  - 结果：命中均为通用安全禁写说明或协议字段名，未发现真实地址、内网 IP、token、cookie、密码、账号或客户端密钥。

### 60 环境 `lineage` 可用性复验

复验时间：2026-06-08

部署提交：

- `aicodex-admin` 分支 `hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract` 已推送并部署到提交 `1e682155`。
- `aicodex-docs` 分支 `dev` 已推送到提交 `c344d8a`。

部署与健康检查：

- 60 环境远端代码目录当前分支为 `hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract`，`HEAD=1e682155`，工作区无未提交改动。
- `fanley/aicodex-admin:test` 容器已重建并处于 `healthy` 状态。
- `GET <deploy60-admin-base-url>/` 返回 `200`。
- `GET <deploy60-admin-base-url>/.well-known/openid-configuration` 返回 `200`，且 discovery JSON 包含 `issuer`、`authorization_endpoint`、`token_endpoint`、`userinfo_endpoint`、`jwks_uri`。

浏览器验证：

- 使用浏览器会话打开 `<deploy60-admin-base-url>/platform-api-mappings`。
- 首次打开时浏览器仍命中过旧前端资源，页面还显示 `血缘信息`；清理浏览器 cache/storage 并 reload 后，最新前端资源生效。
- 页面菜单显示 `API 网关映射`，主标题显示 `AICodex API 组织与账号映射`。
- 组织映射主表不再显示 `血缘信息` 列；点击 `组织映射 -> 添加` 后，新增未保存行只显示平台组织 ID、AICodex API 组织 UUID、映射状态、映射来源和保存按钮，不再出现 JSON textarea。
- 用户映射主表不再显示 `血缘信息` 列；点击 `用户映射 -> 添加` 后，新增未保存行只显示平台主体、AICodex API 用户 ID、映射状态、映射来源和保存按钮，不再出现 JSON textarea。
- 新增行默认展示 `待复核`、`手工维护`；本次浏览器验证未点击保存，不改动 60 测试数据。

## API 组织 UUID 来源说明补充

补充时间：2026-06-08

核对结论：

- `AICodex API 组织 UUID` 应填写 `aicodex-api` 侧组织主数据 UUID，当前代码权威表为 `aicodex_organizations`，权威字段为 `id`。
- `aicodex-api` 已有组织管理接口 `GET /api/organization/`；接口返回 `data[].id`、`data[].code`、`data[].name`、`data[].status` 等字段，其中 `data[].id` 才是 admin 映射页需要的 `apiOrganizationId`。
- `aicodex-api` 管理后台组织页当前路径为 `<aicodex-api-base-url>/console/organization`，页面主表主要展示组织 `code/name/status/default_group` 等信息；页面中看到的 `default` 是 organization code，不是 UUID。
- 当前 admin 映射页不会跨系统自动拉取 API 组织列表；运维需要先从 API 侧接口响应或等价权威查询中拿到 `data[].id`，再填入 `API 网关映射` 页面。
- 后续可用性改进建议：在 `aicodex-api` 组织管理 UI 增加“组织 UUID”展示或“复制组织 UUID”操作，比让 `aicodex-admin` 跨系统直接查询 API 组织目录更小、更符合当前服务边界。

同步文档：

- `aicodex-docs`：`docs/ops/aicodex-admin-api-tenant-mapping-ops.md` 已补充 API UI 入口、`default` 不是 UUID、`GET /api/organization/` 的取值方式和 FAQ。
- `aicodex-docs`：同一运维手册已将“新公司首次接入”整理为通用接入流程，补充按 `API 侧准备 / Admin 侧配置与映射 / 验证侧确认` 分区的 Mermaid 流程图，并按试点、全量放量、报表/投影、shared application 和旧属性迁移拆分场景说明。
- `aicodex-docs`：同一流程图和标准步骤已补充“步骤零：Admin 主数据准备”，明确企业微信、飞书、钉钉等外部组织源同步是 API 映射和 OIDC application 配置之前的前置动作，而不是映射动作本身。

## 映射配置页拆分与用户映射分页补充

补充时间：2026-06-08

调整内容：

- `API 网关映射` 页面拆分为 `平台组织映射`、`用户映射` 两个 tab。
- 首次进入页面只加载平台组织映射；切换到用户映射 tab 后再加载用户映射，避免组织映射运维被大量用户映射数据拖慢。
- 用户映射列表增加服务端分页和关键字搜索，接口参数为 `p`、`pageSize`、`keyword`。
- 用户映射持久化约束修正为同组织内 `adminSubject` 唯一、同组织内非空 `apiUserId` 唯一，不再把 `organizationId` 做成单列唯一。
- gateway projection 测试 fixture 已补充一等 `ApiUserMappings`，保持“只消费一等用户映射、不回退旧 external identity lineage”的契约。

已执行：

- `go test ./object -run "PlatformApi|GatewayProjection|Oidc" -count=1 -timeout 120s`
  - 结果：通过。
  - 覆盖：platform API 映射分页/唯一性、gateway projection 一等映射输入、OIDC 相关对象层回归。
- `go test ./controllers -run "Insight|PlatformApi" -count=1 -timeout 120s`
  - 结果：通过。
  - 覆盖：Insight provider 和 platform API mapping controller 编译/聚焦路径。
- `yarn test PlatformApiMappingPage.test.js PlatformApiMappingBackend.test.js --watchAll=false`
  - 结果：通过，2 个测试套件、4 个测试通过。
  - 备注：输出 React 18 legacy render warning，为当前测试环境既有提示，未影响测试结果。
- `openspec validate stabilize-admin-oidc-multitenant-api-mapping-contract --strict`
  - 结果：通过。

部署注意：

- 如果某个测试环境已经同步过旧模型产生的 `platform_api_user_mapping.organization_id` 单列唯一索引，部署前必须清理该错误唯一索引或重新同步正确索引。否则同一平台组织下只能维护一条用户映射，会直接破坏本 change 的用户映射契约。

## 60 环境 tab 与分页最终复验

复验时间：2026-06-08

部署结果：

- `aicodex-admin` 分支 `hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract` 已由用户按 squash 后历史强制推送到远端。
- 60 测试环境远端代码目录已从旧提交 fast-forward/强制更新到 `ad0d2f18`。
- Docker 镜像 `fanley/aicodex-admin:test` 构建成功，`fanley-aicodex-admin` 容器重建成功。
- 部署脚本健康检查通过，远端容器状态为 `healthy`。

HTTP 冒烟：

- `GET <deploy60-admin-base-url>/` 返回 `200 text/html`。
- `GET <deploy60-admin-base-url>/.well-known/openid-configuration` 返回 `200`，且 discovery 中 `issuer` 非空。
- discovery 的 `claims_supported` 包含 `organization` 与 `client_id`。

浏览器复验：

- 未登录访问 `<deploy60-admin-base-url>/platform-api-mappings` 会跳转登录页，符合后台鉴权预期。
- 使用 60 测试管理员账号登录后，`管理工具 -> API 网关映射` 菜单可进入页面。
- 页面标题显示 `AICodex API 组织与账号映射`。
- 页面显示 `平台组织映射`、`用户映射` 两个 tab；默认停留在 `平台组织映射`。
- `平台组织映射` tab 显示 `平台组织 ID`、`AICodex API 组织 UUID`、`映射状态`、`映射来源` 和 `操作` 列。
- 切换到 `用户映射` tab 后显示搜索框、`平台主体`、`AICodex API 用户 ID`、`映射状态`、`映射来源` 和 `操作` 列。
- 浏览器网络请求确认用户映射接口按分页加载：`GET /api/get-platform-api-user-mappings?...&p=1&pageSize=10` 返回 `200`。
- 浏览器 console 未发现 error/warn。
- 本次复验未新增、保存或删除任何映射数据。

## 2026-06-09 当前状态与最终验收建议

同步时间：2026-06-09

当前状态：

- `aicodex-admin` 侧 OpenSpec tasks 已全部完成，`openspec validate stabilize-admin-oidc-multitenant-api-mapping-contract --strict` 通过。
- `aicodex-admin` 分支 `hfl-test/stabilize-admin-oidc-multitenant-api-mapping-contract` 已推送到远端，60 测试环境已部署到验证记录中的最新提交并通过页面、HTTP discovery、用户映射分页和 console 检查。
- `aicodex-api` 侧已完成 review 与归档，并补齐 API 组织 UUID / API 用户 ID 复制入口、用户所属组织维护和主组织 membership 同步；因此 admin 映射页面所需的 API 侧 ID 获取入口已经具备。
- 以“标准契约、管理入口、字段来源、fail-closed gate、运维手册和 API 侧 ID 获取入口”为边界，admin 到 API 的多租户映射契约已经完备。
- 该结论不表示已经具备全自动批量接入能力；大量用户映射仍建议后续通过迁移候选、批量导入或 resolver 降低人工维护成本。

建议归档前补充执行：

- 按集中运维文档 `docs/ops/aicodex-admin-api-tenant-mapping-ops.md` 的 `10.1 新公司首次接入通用流程`，在 60 测试环境完整跑一轮 synthetic 新公司接入 smoke。
- smoke 应至少覆盖：Admin 主数据准备、API 业务组织准备、复制 API 组织 UUID、复制 API 用户 ID、录入组织映射、录入用户映射、`PENDING_REVIEW -> CONFIRMED`、开启 `Require API mapping`、confirmed 用户 OIDC 登录成功、缺失或非 confirmed 用户映射 fail-closed。
- smoke 不应写入真实地址、内网 IP、token、cookie、密码、Client Secret、真实账号凭据或完整认证头。仓库验证记录只保留脱敏环境别名、状态码、错误码、字段名、日志事件和 synthetic 标识。

未执行：

- 截至本记录，尚未按“新公司首次接入通用流程”完整跑一轮包含 confirmed 用户映射、开启 `Require API mapping`、成功登录和缺失映射 fail-closed 对照的端到端 smoke。

## 60 环境首次 API OIDC 自动建用户行为复验

复验时间：2026-06-09

目的：

- 验证“admin 已同步企业微信用户、admin 侧已配置 platform organization -> API organization UUID 映射后，API 首次 OIDC 登录是否会自动把新 API 用户创建到映射的业务组织内”。
- 本次只验证首次自动创建行为，不开启 `Require API mapping`，避免在 admin 授权阶段因缺少 confirmed `apiUserId` 直接 fail-closed。

准备：

- 在 60 admin 测试环境中选取一个已同步、API 侧尚不存在的企业微信测试用户。
- 通过 admin 后台正常 `SetPassword` 接口为该测试用户设置自动化账密密码；验证不记录真实密码。
- 在 admin `PlatformApiOrganizationMapping` 中为企业微信平台组织补充 confirmed API 组织 UUID 映射。
- 复验前确认 API 侧该测试用户不存在，且 API application 的 `apiMappingRequired` 未开启。

执行结果：

- 通过 API 的 AICodex Admin OIDC 授权入口发起登录，浏览器跳转到 admin 授权登录页。
- 使用该同步用户账密登录成功，OIDC 回调返回 API 控制台。
- API 侧自动创建了本地用户，并写入 `aicodex-admin` OAuth binding。
- 自动创建出的 API 用户 `organization_id` 指向 API 默认组织，而不是 admin 组织映射中配置的 API 业务组织 UUID。
- 新建 API 用户未自动生成业务组织 membership。

结论：

- 当前 `aicodex-api` 的 OIDC 首次登录自动建用户能力可用，但不会消费 admin 侧 platform organization -> API organization UUID 映射来决定新用户所属业务组织。
- “只做组织映射后，首次扫码/账密 OIDC 登录自动把 API 用户创建到目标业务组织”目前不成立。
- 标准接入流程仍需要在 API 自动建用户后，由 API 侧确认或调整用户所属业务组织，再复制 API 用户 ID 回 admin 维护 confirmed 用户映射；或者后续新增 API provisioning/resolver change，让 API 首次登录显式消费 admin 组织上下文并受控创建到目标业务组织。

判断同步：

- 当前 admin 侧 fail-closed gate、禁止弱标识匹配、禁止默认组织/默认用户回退是正确的多租户安全边界。
- 当前“先关闭 gate 触发 API 自动建用户，再由 API 侧确认组织归属并回填 admin 用户映射”的接入路径可运维，但不是目标终态。
- 多租户新企业接入的目标终态不应让首次创建用户默认落入 API 默认组织；后续如果要降低人工维护成本，应在 API 侧补受控 provisioning / resolver，而不是在 admin 侧放宽映射 gate 或增加弱匹配补丁。

## 归档前 token 签发边界复查补充

复查时间：2026-06-09

复查发现并修复两个 fail-closed 缺口：

- `refresh_token` 路径原先按 `client_id` 重新加载 application 后，可能使用 application 持久化默认 organization 查用户和执行 gate；修复后先校验 refresh token 绑定的 application，再按原 Token 记录中的 `organization` 恢复 shared application 上下文。
- `token-exchange`、guest 和小程序等直接签发路径原先没有统一经过 `apiMappingRequired` gate；修复后在产生新 token 前统一执行组织解析和 confirmed API 映射 gate，缺少 confirmed 组织或用户映射时返回 `invalid_grant`。

已在 `admin` 子目录重新执行：

- `go test ./object -run "Test(ValidateApplicationUserTokenContext|BindApplicationToStoredTokenOrganization|SavePlatformApi|GetPaginationPlatformApi|ApplicationOrganizationResolutionPolicyFailsClosed|DynamicClientRegistrationOrganizationResolutionMode|UserInfoUsesStableSubjectAndOrganizationContext|BuildPlatformApiMappingMigrationPlanUsesLegacyFieldsAsCandidatesOnly|BuildGatewayProjectionBatch)" -count=1 -timeout 120s -v`
  - 结果：通过。
  - 覆盖：shared application token 上下文绑定、缺失 confirmed 映射 fail-closed、refresh token 原 organization 恢复、平台 API 映射保存/分页、application 组织解析、DCR、userinfo、迁移候选和 gateway projection 回归。
- `go test ./controllers -run "Insight|PlatformApi|OAuth|WecomProfileConsent" -count=1 -timeout 120s`
  - 结果：通过。
  - 覆盖：Insight provider、platform mapping API、OAuth 和企业微信资料授权相关 controller 路径未出现编译或聚焦测试回归。
