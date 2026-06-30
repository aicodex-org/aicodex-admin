## ADDED Requirements

### Requirement: Admin backend API wrapper TypeScript batch 迁移
Admin 前端 SHALL 支持将 `web-admin/src/backend` 下的后台 API wrapper 按渐进 TypeScript 路线批量迁移为 `.ts`，并保持既有后端 API 契约、导出形态和 JS/TS 共存导入兼容。

#### Scenario: backend wrapper 使用 TS
- **WHEN** `web-admin/src/backend` 下仍为 `.js` 的常规后台 API wrapper 被迁移
- **THEN** 对应生产 wrapper 文件 SHALL 使用 `.ts`
- **AND** 页面、测试和其它调用方 SHALL 继续通过原有无后缀 import 路径解析到同一 wrapper
- **AND** 迁移 SHALL NOT 要求同一 change 迁移页面组件、`web-admin/src/auth/AuthBackend.js`、`ManagementPage`、`App`、`Setting` 或 `BaseListPage`

#### Scenario: API 契约保持不变
- **WHEN** wrapper 迁移为 `.ts`
- **THEN** HTTP method、URL、query/body shape、credential/header 处理、错误处理、返回值透传语义和默认/具名导出 SHALL 与迁移前保持兼容
- **AND** 迁移 SHALL NOT 修改后端 API route、权限、真实配置、认证/OIDC、Provider 配置或 Application/Syncer 页面行为

#### Scenario: 动态响应边界可被局部类型描述
- **WHEN** wrapper 处理通用 API response、record、owner/name/id、pagination、filter、query 或 form payload
- **THEN** 迁移 SHALL 使用局部类型或 `BackendTypes.ts` 中的窄类型描述实际消费边界
- **AND** 对无法精确建模的动态字段 SHALL 使用命名明确的 record/unknown 边界，不得通过无说明的全局宽松类型扩散

#### Scenario: backend 测试迁移并通过
- **WHEN** backend 目录内 `.test.js` 被触碰或依赖迁移后的 wrapper
- **THEN** 对应测试 SHALL 迁移为 `.test.ts`
- **AND** backend focused Jest SHALL 运行真实 suites/tests 且通过，不得以 0 tests 作为验证结果

#### Scenario: TypeScript batch 迁移验证
- **WHEN** Admin backend API wrapper TypeScript batch 迁移完成
- **THEN** OpenSpec strict validate、`git diff --check`、backend focused Jest、`yarn typecheck`、incremental TypeScript gate 和 `yarn build` SHALL pass
- **AND** 若某个 wrapper 迁移牵出页面行为或跨 owner 大改，该 wrapper MAY 被记录为 deferred，且不得阻塞其它低风险 backend wrapper 完成迁移
