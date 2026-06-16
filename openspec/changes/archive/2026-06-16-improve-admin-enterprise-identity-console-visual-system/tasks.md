## 1. OpenSpec 与实现准备

- [x] 1.1 创建 `improve-admin-enterprise-identity-console-visual-system` change，并补齐 proposal、design、tasks 和三页 delta specs
- [x] 1.2 读取企业认证中心现有三页实现、样式和聚焦测试，确认共享结构与安全边界
- [x] 1.3 运行 `openspec validate improve-admin-enterprise-identity-console-visual-system --strict` 和 `git diff --check`

## 2. 企业认证中心工作台实现

- [x] 2.1 新增共享 `EnterpriseIdentityConsoleLayout.tsx` 组件和聚焦测试，覆盖页头、摘要条、状态卡、风险列表、入口网格和区域容器
- [x] 2.2 改造总览页 `/`，强化身份治理控制台角色、跨域摘要、风险待办和能力入口
- [x] 2.3 改造认证源中心 `/providers`，强化认证源摘要、同步/授权诊断、失败摘要和 Provider 列表承载关系
- [x] 2.4 改造应用接入中心 `/applications`，强化当前列表摘要、配置缺口、配置入口和 Application 列表承载关系
- [x] 2.5 收敛 `App.less` 企业认证中心样式，统一画布、边界、密度、响应式和长文本约束

## 3. 验证、记录与回传

- [x] 3.1 运行 OpenSpec strict、`git diff --check`、`yarn typecheck`、聚焦测试/coverage、`yarn build`
- [x] 3.2 按 local-dev 或可用替代方式进行 `/`、`/providers`、`/applications` 桌面浏览器验证，可行时补窄屏验证
- [x] 3.3 补充 `verification.md`，记录验证命令、覆盖率、浏览器证据、剩余风险和未 archive 原因
- [x] 3.4 更新 Admin 企业认证中心路线台账和最终脱敏 report
