## 1. 交付设计与实施前门禁

- [x] 1.1 完成并严格验证 proposal、design、delta spec，确认两条 readiness truth owner 与安全边界。
- [x] 1.2 读取受影响页面、测试、locale 和样式，确认现有 readback 不需要后端扩展。

## 2. 测试驱动的状态分层

- [x] 2.1 先新增 package ready/runtime ready、package ready/runtime partial 与 package blocked 的失败 DOM 测试，覆盖复制禁用条件与安全文案。
- [x] 2.2 在不改变 package/API 契约的前提下实现 package readiness 与 runtime capability readiness 的独立前端派生。
- [x] 2.3 将首屏收敛为两个状态、下一步和单一 CTA；将常量及中性安全说明降级，并保持 loading、empty、error、permission/copying/success/failure 状态。

## 3. 渐进诊断与国际化

- [x] 3.1 实现一级“查看能力详情”，只展示待配置扩展能力的影响/建议和可用能力；默认层不展示 route/owner alias/source。
- [x] 3.2 同步 zh/en locale，确保无硬编码 fallback、无敏感值泄露，并让长文本 copy-safe、截断/tooltip、键盘可达。
- [x] 3.3 更新相关响应式样式，保障 1440px 与 390px 页面级无横向溢出。
- [x] 3.4 已将嵌套“技术详情”改为弱化入口打开的技术诊断 Modal；覆盖 URL 直达、关闭按钮和焦点回归，Esc 由 AntD Modal `onCancel` 处理，窄屏宽度受 CSS 约束。

## 4. 验证与 RC 交付

- [x] 4.1 已重新运行聚焦 Jest（15/15，changed-file coverage statements 85.75%、lines 85.48%）、incremental TypeScript gate、typecheck、build、OpenSpec strict 和 `git diff --check`。
- [x] 4.2 通过既有 60 测试部署脚本将 RC 部署到目标分支提交，并以已授权登录态完成 1440x900 与 390x844 的默认态、能力详情、技术诊断 Modal、console/network、页面级横向溢出和键盘 close/focus 验收；本轮只读审计不重新复制接入包，复制成功沿用既有受控测试与用户截图证据。
- [x] 4.3 已更新 runtime closure audit、完成 pre-archive review 与脱敏 verification 记录，并提交 RC；仅 push 工作分支，不 archive、不合并基线或 test。
