## Why

Admin 前端 `web-admin` 当前是 React 18 + JavaScript 项目，后续企业认证中心 UI/产品化开发需要逐步引入 TypeScript 来约束组件 props、共享逻辑和接口模型。现在需要建立最小可验证的 TS 基建，让 JS/TS/TSX 可以共存，并避免全量迁移历史 JS 带来的高风险和大 diff。

## What Changes

- 为 `web-admin` 增加 TypeScript 编译与类型依赖，包括 `typescript`、`@types/react`、`@types/react-dom` 和必要 `tsconfig.json`。
- 增加 `yarn typecheck`，用 `tsc --noEmit` 校验新增 TS/TSX 与渐进迁移文件。
- 保持现有 JS 构建、测试和运行方式不变，允许 `.js`、`.ts`、`.tsx` 在 `src` 下共存。
- 迁移一个低风险展示组件作为 smoke test，证明 `.tsx` 能被构建、测试和 typecheck 接纳。
- 固化后续规则：新增 React 组件默认 `.tsx`；新增共享逻辑、接口模型和类型定义默认 `.ts`；老 JS 只在被需求触及时渐进迁移；避免无解释 `any`。
- 不迁移全量历史 JS，不改变认证、授权、OAuth/OIDC、Provider contract、Gateway projection 或生产/类生产配置行为。

## Capabilities

### New Capabilities

- `web-admin-incremental-typescript`: 定义 Admin 前端渐进式 TypeScript 基建、JS/TS/TSX 共存、typecheck 验证、smoke 迁移和后续新增代码规则。

### Modified Capabilities

- 无。

## Impact

- 主要影响 `web-admin/package.json`、`web-admin/yarn.lock`、`web-admin/tsconfig.json`、一个低风险 `web-admin/src` 展示组件及其聚焦测试。
- OpenSpec 新增 `openspec/changes/enable-incremental-typescript-for-web-admin/` 下的 proposal、design、tasks、spec delta 和 verification。
- 不影响后端、数据库、真实密钥、认证/授权链路、Provider 配置、Gateway projection 发布、`test` 分支或共享 `hfl-test-base` 历史。
