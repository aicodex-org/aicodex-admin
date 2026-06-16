## Context

`web-admin` 当前使用 React 18、`react-scripts` 5 和 `@craco/craco`，入口为 `src/index.js`，源码主要为 `.js` React 文件。CRA/CRACO 可以在项目安装 TypeScript 后编译 `.ts/.tsx`，但仓库还没有 `tsconfig.json`、TypeScript 依赖或独立 typecheck 脚本。

本 change 属于 Admin 企业认证中心路线的前端工程基建，服务后续 UI/产品化开发。它不接组织边界路线，也不改变 Admin 认证、登录、Provider、OAuth/OIDC 或 Gateway projection 运行时行为。

## Goals / Non-Goals

**Goals:**
- 让 `web-admin` 支持 `.js`、`.ts`、`.tsx` 共存，并保持现有 JS 继续构建、测试和运行。
- 用 `yarn typecheck` 提供可重复的 TypeScript 静态验证入口。
- 迁移一个低风险展示组件作为 smoke test，覆盖 TSX 编译、测试和构建路径。
- 在 OpenSpec 中固化后续新增文件默认规则和 `any` 使用边界。

**Non-Goals:**
- 不迁移全量历史 JS。
- 不强制 `checkJs` 检查既有 JS，不把本 change 变成全仓类型修复。
- 不改变登录、认证、授权、OAuth/OIDC、Provider contract、Gateway projection、真实密钥或生产/类生产配置。
- 不合入或 push `test`，不 force-push 共享 `hfl-test-base`。

## Decisions

### 1. 使用 CRA 兼容的渐进式 tsconfig

`tsconfig.json` 放在 `web-admin/` 根目录，设置 `allowJs: true`、`checkJs: false`、`noEmit: true`，并启用 `strict`、`skipLibCheck`、`jsx: react-jsx`、`moduleResolution: node` 等 CRA 兼容选项。这样新增 TS/TSX 获得较严格约束，既有 JS 不会被一次性纳入类型修复。

备选方案是开启 `checkJs` 或全量迁移入口文件，但会暴露大量历史 JS 类型问题，超出本次“最小可验证基建”的目标。

### 2. 用 `yarn typecheck` 固化静态验证入口

在 `web-admin/package.json` 增加 `typecheck: tsc --noEmit`。构建仍由 `craco build` 负责，测试仍由 `craco test` 负责，typecheck 独立运行，便于后续 OpenSpec change 统一纳入验证清单。

备选方案是在 `build` 前隐式跑 typecheck，但这会改变既有构建耗时和失败面。本次先提供显式命令，后续 CI 接入可另起 change 决定。

### 3. 选择 `basic/ShortcutsPage` 作为 TSX smoke 迁移

`ShortcutsPage` 是管理页中的快捷入口展示组件，调用面仅为 `/shortcuts` 路由，不属于登录执行、认证授权、Provider 配置或 Gateway projection 发布链路。迁移时保留默认导出和路由使用方式，新增可测试的快捷项构造函数，证明 TSX、JS import、React 渲染和 Jest 测试可共存。

备选候选如 `CustomGithubCorner` 会出现在登录/注册页，`PasswordChecker` 直接参与登录/注册密码校验，均不适合作为本次低风险 smoke 对象。

## Risks / Trade-offs

- [CRA 与 TypeScript 版本兼容] → 使用 `react-scripts` 5 兼容的 TypeScript 4.x 版本，并通过 `yarn typecheck` 与 `yarn build` 验证。
- [历史 JS 被一次性拉入类型修复] → `allowJs: true` 配合 `checkJs: false`，只要求 TS/TSX 和类型声明路径通过。
- [TSX smoke 迁移误碰业务链路] → 仅迁移 `/shortcuts` 展示组件，不修改登录、Provider、OAuth/OIDC 或 Gateway projection 文件。
- [后续开发继续随意新增 JS] → OpenSpec 规则明确新增 React 组件默认 `.tsx`，新增共享逻辑/接口模型/类型定义默认 `.ts`，老 JS 只在被需求触及时迁移。

## Migration Plan

1. 新增 OpenSpec proposal、design、tasks、spec delta 并 strict validate。
2. 安装 TypeScript 与 React 类型依赖，新增 `web-admin/tsconfig.json` 和 `typecheck` 脚本。
3. 先写 `ShortcutsPage` smoke 测试并确认 RED，再迁移 `ShortcutsPage.js` 为 `ShortcutsPage.tsx`。
4. 运行 `yarn typecheck`、聚焦测试、`yarn build`、`openspec validate`、`git diff --check`。
5. 补充 `verification.md`、最终报告和路线台账；本 change 暂不 archive，保留工作分支供主调度评估。

## Open Questions

- 无需当前决策。后续是否把 `yarn typecheck` 接入 CI 或 pre-commit，应由单独 change 评估构建耗时和历史分支影响。
