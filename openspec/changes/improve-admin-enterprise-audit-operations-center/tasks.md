## 1. OpenSpec 与只读基线

- [x] 1.1 补齐 `improve-admin-enterprise-audit-operations-center` proposal、design、tasks、delta specs 和 verification 初稿
- [x] 1.2 核对当前审计运维导航 IA、配置树复用点、四个列表页和现有企业认证中心工作台组件
- [x] 1.3 运行 `openspec validate improve-admin-enterprise-audit-operations-center --strict`

## 2. 测试先行

- [x] 2.1 更新导航与 `NavItemTree` 聚焦测试，先验证审计运维叶子文案和 key 兼容性失败
- [x] 2.2 新增 `AuditOperationsCenter` 聚焦测试，先验证摘要、入口、风险核对和敏感信息不展示失败
- [x] 2.3 根据失败测试确认实现范围，不扩大到后端、认证授权执行或 Gateway publish

## 3. 审计运维工作台实现

- [x] 3.1 新增 `web-admin/src/AuditOperationsCenter.tsx`，基于当前列表视图输出只读摘要、入口和风险核对
- [x] 3.2 在 `/sessions`、`/records`、`/tokens`、`/verifications` 四个列表页嵌入工作台壳层，保留表格和既有操作行为
- [x] 3.3 同步 `enterpriseNavigation.js`、zh/en locale、导航测试和配置树测试，保持运行时侧栏与配置树同 IA
- [x] 3.4 补充 `App.less` 中审计运维工作台与表格承载区的响应式间距和长文本约束

## 4. 验证与收尾

- [x] 4.1 运行 OpenSpec strict、`git diff --check`、`yarn typecheck`
- [x] 4.2 运行聚焦 Jest/coverage，覆盖新增 TSX 与触达导航/列表页面
- [x] 4.3 运行 `yarn build`
- [x] 4.4 使用浏览器验证桌面和窄屏的 `/sessions`、`/records`、`/tokens`、`/verifications`，检查无 overlay、无明显重叠、导航选中正常
- [x] 4.5 更新 `verification.md`、路线台账和最终脱敏 report，并向主控线程短回传
