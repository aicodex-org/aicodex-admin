## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、verification 和 spec delta，中文说明并保留必要英文技术名词。
- [x] 1.2 运行 `openspec validate implement-admin-service-credential-governance-config-status-overlay --strict`。
- [x] 1.3 完成实施前 review，确认 scope、写集、安全边界、TDD 和验证计划无阻断问题。

## 2. Backend Overlay

- [x] 2.1 先写 RED focused Go tests，覆盖无保存配置 legacy fallback、saved enabled overlay、saved disabled fail-closed、missing/partial overlay 和脱敏。
- [x] 2.2 实现 status endpoint 只读读取 saved config，并仅对 `usage_identity_resolver`、`gateway_organization_projection` 应用 copy-safe overlay。
- [x] 2.3 保持 status response shape、global-admin guard、路由、权限和 legacy fallback 兼容。
- [x] 2.4 确认 overlay 不触发 credential test、external secret 解析、Gateway projection publish/refresh、API/Gateway/Insight runtime 调用。

## 3. Application Access

- [x] 3.1 评估既有 `/applications` 服务凭据治理摘要是否无需改动即可展示 overlay 后状态。
- [x] 3.2 如必须改 UI，仅做状态可见性相关最小改动，并补 focused `.test.tsx`。
- [x] 3.3 若触碰 `web-admin`，运行增量 TypeScript gate、focused Jest 和 `yarn typecheck`。

## 4. Verification And Closeout

- [x] 4.1 运行 focused Go tests 和受影响 package/file coverage，记录覆盖率对象和结果。
- [x] 4.2 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`。
- [x] 4.3 更新 `verification.md`，记录命令、结果、覆盖率、脱敏说明和剩余风险。
- [x] 4.4 完成归档前 review 并修复阻断项。
- [x] 4.5 archive change，重新验证 changes/specs strict。
- [ ] 4.6 收敛为一个 change commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，`push_test=false`。
- [ ] 4.7 写最终 report 到 vault 并回传结构化 closeout。
