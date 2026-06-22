## 1. OpenSpec

- [x] 创建 proposal/design/tasks/spec delta，限定身份总览首屏展示打磨范围。
- [x] 运行 `openspec validate polish-admin-identity-overview-information-credibility --strict`。
- [x] 完成实施前 review，确认不新增 API、不改后端、不新增中心入口。

## 2. TDD 与实现

- [x] 先调整聚焦测试，覆盖同屏 `用量归因完整度` 口径一致、短副标题、repo tag 次级化、审计 CTA 去重复。
- [x] 观察聚焦测试 RED，确认失败原因来自当前 UI 行为缺口。
- [x] 最小实现身份总览首屏 polish，保持现有路由、权限、接口和文案语义兼容。
- [x] 同步必要 zh/en locale 文案和局部样式。

## 3. 验证

- [x] 运行身份总览聚焦 Jest/coverage。
- [x] 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 运行 `cd web-admin; yarn typecheck`。
- [x] 运行 `cd web-admin; yarn build`。
- [x] 运行 `git diff --check`。
- [x] 浏览器验证 `/` 桌面 `1440x900`，可行时补移动 `390x844`，记录 console/pageerror/横向溢出结果。

## 4. 归档与收口

- [x] 完成归档前 review，检查文档语言、验证证据、覆盖率、脱敏和写集边界。
- [x] Archive change，并运行 `openspec validate --changes --strict` 与 `openspec validate --specs --strict`。
- [x] 收敛为最新 `origin/hfl-test-base + 1` 个本 change commit。
- [x] push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地和远端工作分支，最终 clean/aligned。
- [x] 写入最终 report 并结构化回传。
