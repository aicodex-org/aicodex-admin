## 1. OpenSpec

- [x] 1.1 创建 `migrate-application-access-menu-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 页面迁移

- [x] 2.1 将 `/applications` 落地页 `ApplicationListPage` 迁移为 `.tsx`，保留 `ApplicationAccessCenter`、路由、列表行为和测试。
- [x] 2.2 将 `/resources` 落地页 `ResourceListPage` 迁移为 `.tsx`，补充或迁移聚焦测试。
- [x] 2.3 将 `/certs` 落地页 `CertListPage` 迁移为 `.tsx`，补充或迁移聚焦测试。
- [x] 2.4 将 `/keys` 落地页 `KeyListPage` 迁移为 `.tsx`，补充或迁移聚焦测试。
- [x] 2.5 将 `/platform-api-mappings` 落地页 `PlatformApiMappingPage` 和对应 JSX 测试迁移为 `.tsx` / `.test.tsx`。
- [x] 2.6 将 `/webhooks` 落地页 `WebhookListPage` 迁移为 `.tsx`，补充或迁移聚焦测试。
- [x] 2.7 将 `/webhook-events` 落地页 `WebhookEventListPage` 迁移为 `.tsx`，补充或迁移聚焦测试。

## 3. 验证

- [x] 3.1 运行 `openspec validate migrate-application-access-menu-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 3.2 运行 `git diff --check`。
- [x] 3.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 3.4 在 `verification.md` 记录命令、覆盖率对象、结果和剩余风险，验证记录保持脱敏。

## 4. 收口

- [x] 4.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 4.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
