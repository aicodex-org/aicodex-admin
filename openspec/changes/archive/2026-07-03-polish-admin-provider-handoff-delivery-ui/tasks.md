## 1. OpenSpec

- [x] 1.1 创建并验证 `polish-admin-provider-handoff-delivery-ui` change，明确默认层去技术化和 P0 边界。

## 2. 前端实现

- [x] 2.1 调整 `ApplicationAccessServiceCredentialGovernancePanel` 默认摘要为交接状态、下一步、目标消费方、包类型。
- [x] 2.2 将 wrapper route、owner alias、缺失 key 等技术信息收进 `技术细节`，默认能力清单改成人话状态。
- [x] 2.3 强化 `生成 Admin 交接包` 主动作和缺项提示，不新增后端 contract 或 secure handoff。
- [x] 2.4 更新 zh/en i18n 和响应式样式，保持 390px 窄屏不横向溢出。

## 3. 测试与验证

- [x] 3.1 更新聚焦 Jest 测试，覆盖默认摘要、人话能力清单、技术细节折叠和敏感材料不渲染。
- [x] 3.2 运行 OpenSpec、聚焦测试、增量 TS gate、typecheck、build、`git diff --check`。
- [x] 3.3 成本可控时执行本地 mock-auth browser smoke，检查 390px/1440px 无横向溢出且 console error=0。
