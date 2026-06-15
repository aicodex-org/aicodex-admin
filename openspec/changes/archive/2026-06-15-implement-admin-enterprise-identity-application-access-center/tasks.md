## 1. OpenSpec 与实施前审查

- [x] 1.1 创建 `implement-admin-enterprise-identity-application-access-center` change，并补齐 proposal、design、tasks 和 delta specs
- [x] 1.2 对 proposal/design/tasks/specs 做实施前 review，修复 Blocking/Fixable 问题
- [x] 1.3 运行 `openspec validate "implement-admin-enterprise-identity-application-access-center" --strict` 和 `git diff --check`

## 2. 应用接入中心实现

- [x] 2.1 先新增应用接入状态推导和渲染测试，覆盖完整应用、缺失回调、缺失授权范围、停用应用、空态和敏感字段不外露
- [x] 2.2 新增 `ApplicationAccessCenter` 只读组件，展示接入完整度、启用/停用、回调地址、授权范围、Provider 绑定、OAuth/OIDC client 和风险摘要
- [x] 2.3 将 `ApplicationAccessCenter` 嵌入 `ApplicationListPage` 表格上方，保持旧 Application 列表分页、筛选、排序、新增、复制、编辑和删除行为不变
- [x] 2.4 更新企业认证中心总览入口和导航文案，使应用接入入口指向 `/applications` 应用接入中心并保留 `/platform-api-mappings` 深链接

## 3. 样式、验证和归档准备

- [x] 3.1 补充企业管理台样式和响应式约束，避免按钮、标签、卡片和长文本溢出
- [x] 3.2 运行聚焦前端测试、覆盖率检查、构建或等效静态校验
- [x] 3.3 如本地环境可用，做浏览器或截图验证；不可用时记录具体原因和替代证据
- [x] 3.4 补充 `verification.md`，记录 OpenSpec、测试、覆盖率、构建/UI 验证和剩余风险
- [x] 3.5 完成归档前 review，修复阻断问题后 archive change
