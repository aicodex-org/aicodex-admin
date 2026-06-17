## 1. OpenSpec 与基线

- [x] 1.1 创建并校验本 change 的 proposal、design、delta specs、tasks 和 verification 文档
- [x] 1.2 确认当前工作分支来自最新 `origin/hfl-test-base`，并记录既有 active changes 不属于本写集

## 2. 聚焦测试

- [x] 2.1 为认证源、应用接入、审计运维和 LLM AI/Gateway 的紧凑首屏结构补充聚焦 React 测试
- [x] 2.2 为企业认证中心路由关闭旧英文 Tour 补充聚焦测试
- [x] 2.3 运行聚焦测试并确认新增断言在实现前按预期失败

## 3. 前端实现

- [x] 3.1 压缩 `/providers` 顶部接入诊断区并保持 Provider 列表可见、可操作
- [x] 3.2 调整 `/applications` 为列表优先结构，降权应用接入卡片网格并保留缺口摘要
- [x] 3.3 调整 `/sessions`、`/records`、`/tokens`、`/verifications` 为紧凑运行态核对结构
- [x] 3.4 调整 `/agents` 顶部 AI/Gateway 区域，让 Agent 列表和关键入口进入首屏
- [x] 3.5 在企业认证中心路由下默认关闭旧英文 Tour 或替换为本地化企业认证中心文案
- [x] 3.6 收敛移动端页头、摘要和入口间距，减少 `/applications`、`/records`、`/agents` 顶部大空白
- [x] 3.7 清理本轮触碰范围内硬编码中文、英文 fallback、实现痕迹文案和 Keys/Webhooks/Webhook Events 中文界面残留，同步 `zh` / `en` locale

## 4. 验证与交付

- [x] 4.1 运行 OpenSpec strict 校验、`git diff --check`、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`
- [x] 4.2 使用 local-dev 或安全只读浏览器方式复验桌面 1440x900 与移动 UA，记录目标页面 list/table top 坐标
- [x] 4.3 更新 `verification.md`、路线台账和最终脱敏报告
- [x] 4.4 归档 OpenSpec，整理为一个逻辑 commit，并确认未触碰 `test`、无终端或进程残留
