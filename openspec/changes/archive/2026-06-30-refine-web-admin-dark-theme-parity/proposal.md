## Why

最近一轮 `web-admin` 共享列表页壳和身份控制台页壳改造，已经把亮色模式的密度和层级收得比较稳，但暗黑模式下仍有多处近期页面残留硬编码浅色背景、边框和文字色。管理员切换主题后，会看到白色外层 panel、浅色卡片孤岛和细节抽屉对比失衡，直接破坏已经统一起来的共享列表壳体验。

## What Changes

- 扩展身份控制台共享 shell / list page 的主题 token 使用范围，让近期接入共享页壳的页面局部 surface、divider、secondary text 和 copy feedback 统一跟随明亮/暗黑主题切换。
- 将组织/用户紧凑列表外层 panel、结果数分隔、目录健康辅助上下文、身份资产关系 selector/evidence 区、接入向导 cards/check/result/evidence 区、审计记录详情抽屉以及用量接入治理块从硬编码浅色样式切换为共享主题 token。
- 将系统信息页纳入 cardless route 和共享系统信息面板布局，收敛 CPU 指标密度、API 监控表格内部滚动和明亮/暗黑 surface 层级，避免旧的大外框窄列布局回归。
- 将 MCP Store 卡片目录页纳入 cardless route 和共享 card catalog surface，收敛筛选工具栏、目录卡片、Tag、链接和添加按钮的双主题层级。
- 补充暗黑模式回归测试和浏览器巡检，确认关键页面切换主题后不再出现显著白底孤岛、错位分隔线或不可读的复制反馈状态。

## Capabilities

### New Capabilities
无。

### Modified Capabilities
- `admin-enterprise-identity-console-shell`: 共享 shell、共享页壳和紧凑列表页壳在暗黑模式下的 outer panel、toolbar、divider 和文本 token 一致性。
- `admin-enterprise-organization-identity-center`: 组织账号共享列表壳、结果数和目录健康辅助上下文的暗黑模式一致性。
- `admin-enterprise-identity-asset-relationship-layer`: 身份资产关系 selector、证据摘要和详情折叠区的暗黑模式一致性。
- `admin-enterprise-identity-connection-wizards`: 接入向导 domain card、step panel、check/result/evidence block 的暗黑模式一致性。
- `admin-enterprise-identity-usage-access-entry`: 用量接入服务凭据治理块和摘要面板的暗黑模式一致性。
- `admin-enterprise-identity-audit-operations-center`: 审计记录详情抽屉、折叠区和 copy feedback 的暗黑模式一致性。

## Impact

- 主要影响 `web-admin/src/App.less` 中近期共享页壳消费者的自定义样式、系统信息页和 MCP Store 局部面板样式，以及 `web-admin/src/App.js`、`web-admin/src/ManagementPage.js` 对主题 class 和 cardless route 的承载路径。
- 影响 `web-admin/src/ManagementPage.shell.test.tsx`、`web-admin/src/common/EnterpriseListQueryToolbar.test.tsx` 等前端回归测试。
- 不涉及后端 API、RBAC、路由 key、主题切换接口协议或数据模型变更。
