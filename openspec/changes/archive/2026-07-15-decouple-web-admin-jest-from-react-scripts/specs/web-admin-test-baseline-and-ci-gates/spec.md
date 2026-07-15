## MODIFIED Requirements

### Requirement: 测试基线修复保持生产行为兼容
测试工具链与基线 change SHALL 保持现有生产页面、路由、权限、后端请求契约和用户可见行为兼容。为使 Jest 脱离 React Scripts，change MAY 将当前实际使用的 Jest、Babel transform、jsdom、module mapper 与 watch plugin 固定为显式开发依赖并更新 `yarn.lock`，但 SHALL NOT 新增或升级 React、React Router、Testing Library、业务运行时依赖或 production build 工具链。

#### Scenario: 验证 Jest 解耦 change 写集
- **WHEN** review Jest 解耦 change 的最终 diff
- **THEN** 实现写集 SHALL 限于 Jest config/transform/mock、测试与测试 scripts、必要的测试开发依赖/lockfile、frontend Jest CI step 和 OpenSpec artifacts
- **AND** `react-scripts` 及只为其服务的重复 package 配置 SHALL 被移除
- **AND** 生产组件、Vite `start/build`、public scripts、Go tests、backend/integration/linter jobs SHALL 无行为修改
- **AND** `yarn.lock` 变化 SHALL 只对应显式测试依赖、React Scripts 移除及其不再被其它 owner 使用的传递依赖
