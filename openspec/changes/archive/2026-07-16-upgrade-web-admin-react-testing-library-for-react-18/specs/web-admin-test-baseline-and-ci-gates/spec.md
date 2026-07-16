## ADDED Requirements

### Requirement: React 测试工具链升级保持 discovery 与诊断完整
React 测试工具链升级 SHALL 保留既有 Jest 与 Playwright discovery、测试行为和断言强度。升级 SHALL NOT 通过删除或合并测试、`skip` / `only`、扩大 mock、延长 timeout、全局 `console` ignore 或静默局部 warning filter 制造通过；与本次 legacy root 无关的 warning SHALL 保持可审计。

#### Scenario: 对照升级前后 Jest 基线
- **WHEN** 开发者完成 Testing Library 升级并执行全量 `yarn test:ci`
- **THEN** Jest SHALL 发现至少 144 个 suite 与 1369 个 test
- **AND** 所有已发现测试 SHALL 以 0 失败完成
- **AND** 旧 discovery 路径 SHALL 无缺失

#### Scenario: 审计 legacy root 告警
- **WHEN** 开发者使用非 silent Jest 命令运行 React 18 代表性和全量回归
- **THEN** `ReactDOM.render is no longer supported` 告警计数 SHALL 为 0
- **AND** 测试 setup、Jest config 与目标测试文件 SHALL 不包含该告警的 suppression
- **AND** 其它 warning SHALL 不因本 change 新增的过滤而消失

#### Scenario: 保持 Playwright 与生产工具链边界
- **WHEN** Testing Library 依赖和测试迁移完成
- **THEN** Playwright discovery SHALL 保持 19 个 spec / 22 个 test
- **AND** app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts 与 Vite build SHALL 继续通过
- **AND** Vite、Playwright、CI 结构、生产组件和业务运行时依赖 SHALL 无行为修改

## MODIFIED Requirements

### Requirement: 测试基线修复保持生产行为兼容
测试工具链与基线 change SHALL 保持现有生产页面、路由、权限、后端请求契约和用户可见行为兼容。为使 Jest 脱离 React Scripts，change MAY 将当前实际使用的 Jest、Babel transform、jsdom、module mapper 与 watch plugin 固定为显式开发依赖并更新 `yarn.lock`；专用于 React 18 测试渲染兼容的 change MAY 在 peer 约束相容且完整质量门禁通过时升级 Testing Library 及其必要 peer dev dependency。此类 change SHALL NOT 新增或升级 React、React Router、业务运行时依赖或 production build 工具链。

#### Scenario: 验证测试工具链 change 写集
- **WHEN** review Jest 解耦或 React 18 Testing Library 兼容 change 的最终 diff
- **THEN** 实现写集 SHALL 限于 Jest config/transform/mock、测试与测试 scripts、必要的测试开发依赖/lockfile、适用的 frontend Jest CI step 和 OpenSpec artifacts
- **AND** 生产组件、Vite `start/build`、public scripts、Go tests、backend/integration/linter jobs SHALL 无行为修改
- **AND** `yarn.lock` 变化 SHALL 只对应显式测试依赖及其不再被其它 owner 使用的传递依赖
