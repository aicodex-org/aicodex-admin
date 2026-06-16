## 1. OpenSpec 与方案确认

- [x] 1.1 创建 `enable-incremental-typescript-for-web-admin` change，并补齐 proposal、design、tasks 和 `web-admin-incremental-typescript` delta spec
- [x] 1.2 检查现有 active changes/specs，确认本 change 不修改认证、Provider、Gateway projection 或组织边界路线规格
- [x] 1.3 运行 `openspec validate "enable-incremental-typescript-for-web-admin" --strict`

## 2. TypeScript 基建

- [x] 2.1 为 `web-admin` 安装 `typescript`、`@types/react`、`@types/react-dom`，并更新 lockfile
- [x] 2.2 新增 `web-admin/tsconfig.json`，允许 JS/TS/TSX 共存，保持 `checkJs` 关闭并启用 no-emit typecheck
- [x] 2.3 在 `web-admin/package.json` 增加 `typecheck` 脚本，执行 `tsc --noEmit`

## 3. TSX smoke 迁移

- [x] 3.1 先新增 `ShortcutsPage` smoke 测试，确认迁移前因缺少导出的 TS smoke helper 失败
- [x] 3.2 将 `web-admin/src/basic/ShortcutsPage.js` 迁移为 `ShortcutsPage.tsx`，保留默认导出、`/shortcuts` 路由调用面和现有可见行为
- [x] 3.3 确认 `ShortcutsPage` 测试通过，证明 TSX 组件和 JS 组件 import 可被测试接纳

## 4. 验证、记录和交付

- [x] 4.1 运行 `yarn typecheck`
- [x] 4.2 运行受影响前端测试和覆盖率或说明覆盖率边界
- [x] 4.3 运行 `yarn build`
- [x] 4.4 运行 `git diff --check`，补充 `verification.md`
- [x] 4.5 写最终报告并更新 Admin 企业认证中心路线台账；本 change 暂不 archive，不合入 `hfl-test-base`，不触碰 `test`
