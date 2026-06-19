## 1. OpenSpec 与实施前门禁

- [x] 1.1 从最新 `origin/hfl-test-base` 创建 `hfl-test/migrate-authorization-casbin-model-pages-to-typescript`，确认工作区 clean 且 active changes 写集不冲突。
- [x] 1.2 创建 proposal/design/tasks/spec delta，并运行 `openspec validate migrate-authorization-casbin-model-pages-to-typescript --strict`。
- [x] 1.3 完成 `openspec-pre-implementation-review`，确认 scope、写集、风险和验证计划无 Blocking/Fixable。

## 2. TSX 迁移

- [x] 2.1 将 `web-admin/src/CasbinEditor.js` 重命名为 `CasbinEditor.tsx`，补充 model props、回调、iframe ref 和 message 事件类型，保持 Basic/Advanced tab 与同步逻辑不变。
- [x] 2.2 将 `web-admin/src/ModelListPage.js` 重命名为 `ModelListPage.tsx`，补充列表页 props/state、model record、pagination/fetch params、table columns 和 backend response 类型，保持列表行为不变。
- [x] 2.3 将 `web-admin/src/ModelEditPage.js` 重命名为 `ModelEditPage.tsx`，补充 route props/state、model/organization record 和 save/delete response 类型，保持加载和保存行为不变。
- [x] 2.4 确认 `ManagementPage.js` 无后缀 import 和 `/models` 路由语义不变，且不迁移角色/权限/授权关系与证据/适配器/执行器页面。

## 3. 测试

- [x] 3.1 新增或迁移 Casbin 模型相关 `.test.tsx`，不新增 `.js/.jsx` 测试。
- [x] 3.2 覆盖 `CasbinEditor` tab 切换、iframe 同步、Basic 文本变更和内置对象只读保护。
- [x] 3.3 覆盖 `ModelListPage` 列表渲染、新增成功跳转、删除成功刷新和错误提示。
- [x] 3.4 覆盖 `ModelEditPage` model/organization 加载、保存、保存并退出、保存失败回滚 name 和新增取消删除。
- [x] 3.5 记录 changed-file / changed-function coverage，重点关注迁移文件和新增测试。

## 4. 验证、归档与收口

- [x] 4.1 运行 `openspec validate migrate-authorization-casbin-model-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、focused Jest tests/coverage。
- [x] 4.3 若路由/import/build-time 行为受影响，运行 `yarn build` 并记录 warning。
- [x] 4.4 补充 `verification.md`，完成 `openspec-pre-archive-review` 并修复发现的问题。
- [x] 4.5 archive change，archive 后重新运行 specs/changes strict 和 diff check。
- [x] 4.6 按 `self-closeout=true` 收敛为 `origin/hfl-test-base + 1 个本 change commit`，push 工作分支，ff-only push `hfl-test-base`，删除工作分支，确认 workspace clean，严禁 push/merge `test`。
