# 验证记录

## 范围

- `Internal + Normal` 首页扫码登录主流程通过前端组件测试覆盖：创建企业微信敏感授权 intent、渲染 OAuth2 二维码、轮询授权状态、授权后 complete、MFA 分支、过期/失败/刷新/兼容网页登录回退。
- 后端企业微信扫码回调通过 controller 测试覆盖：pending intent 授权成功、重复回调幂等、授权失败标记、OIDC `email` scope 下企业微信未返回邮箱时 fail-closed 并写入可恢复错误码。
- `Third-party` / `Silent` 组合仍按设计定位为配置校验和兼容支持，不作为首页二维码主链路验收目标；当前文档在 `docs/new-developer-quickstart.md` 中记录了主交付路径和兼容 fallback 限制。

## 已执行命令

- `go test -run WecomProfileConsent -count=1 ./controllers`：通过。
- `yarn test src/auth/WeComLoginPanel.test.tsx --watchAll=false --runInBand`：通过；输出包含既有 React 18 `ReactDOM.render` 警告。
- `yarn typecheck`：通过。
- `go test -v -run "TestStandardOIDCEmailMissingForRegistrationErrorGuidesWeComEmailPermission|TestFindOrCreateOAuthUser_StandardOIDCProviderRejectsRegistrationWhenEmailMissing" -count=1 ./internal/controller`：API 侧新增纯文案测试通过；原缺邮箱 DB 依赖测试因未配置 `AICODEX_TEST_POSTGRES_DSN` 跳过。
- `openspec validate add-wecom-homepage-login-and-admin-config --strict`：通过。
- `git diff --check`：Admin 与 API 仓库均通过。

## 覆盖率

- `go test -run WecomProfileConsent -count=1 -coverprofile <temp-cover> ./controllers` + `go tool cover -func <temp-cover>`：Admin 受影响函数覆盖率达标；`handleWecomProfileConsentLoginCallback` 96.0%、`markWecomProfileConsentIntentFailed` 100.0%、`AuthorizeLoginIntent` 96.8%、`requiresEmailClaimForWecomProfileConsent` 100.0%、`wecomProfileConsentScopeIncludes` 100.0%。
- `yarn test src/auth/WeComLoginPanel.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/auth/WeComLoginPanel.tsx`：`WeComLoginPanel.tsx` 覆盖率达标；Statements 85.53%、Branches 80.75%、Functions 86.00%、Lines 85.89%。
- `go test -run TestStandardOIDCEmailMissingForRegistrationErrorGuidesWeComEmailPermission -count=1 -coverprofile <temp-cover> ./internal/controller` + `go tool cover -func <temp-cover>`：API 侧新增 `StandardOIDCEmailMissingForRegistrationError.Error()` 覆盖率 100.0%。

## 运行态边界

- 本轮没有使用真实企业微信外部授权环境完成端到端扫码；验证结论限定为源码级、组件级和 controller/API 单元测试级。
- 真实企业微信侧是否再次返回邮箱仍取决于用户在企业微信个人敏感信息管理中的授权状态；本变更的目标是在未返回邮箱时 fail-closed 并给出可恢复提示。
