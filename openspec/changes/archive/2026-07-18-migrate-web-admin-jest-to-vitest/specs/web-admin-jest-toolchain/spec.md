## REMOVED Requirements

### Requirement: web-admin 使用显式 Jest 测试工具链
**Reason**: 单元测试 runner 原子迁移到 `web-admin-vitest-toolchain`，Jest 不再是活动工具链。
**Migration**: 使用精确 Vitest config、jsdom、setup 与 Vite transform；删除 Jest config、Babel Jest transform和Jest依赖。

### Requirement: 样式与资产模块具有稳定测试替身
**Reason**: Jest mapper/support由Vitest test-only asset support接管。
**Migration**: 使用 `web-admin-vitest-toolchain` 定义的CSS Modules、普通style、asset与SVG契约。

### Requirement: Jest discovery 保留完整基线
**Reason**: discovery真值迁移到Vitest且最新基线已增长为157 files / 1503 tests。
**Migration**: 使用Vitest discovery对照迁移前157条规范化Jest路径。

### Requirement: 开发与 CI 测试入口保持稳定体验
**Reason**: package与CI入口不再调用Jest。
**Migration**: `bun run test`使用Vitest watch，`bun run test:ci`使用non-silent串行 `vitest run`。

### Requirement: 既有 Jest 运行语义保持兼容
**Reason**: mock、timer、module与jsdom兼容责任迁移到Vitest能力。
**Migration**: 使用显式 `vi`、`vi.hoisted`、`vi.importActual`、`vi.resetModules`和局部ESM/CJS适配。

### Requirement: 测试覆盖率由显式配置管理
**Reason**: coverage由Vitest provider接管，不再由Jest Babel provider管理。
**Migration**: 使用Vitest coverage include/exclude与text/json/lcov/clover reporters。

### Requirement: Jest 解耦不改变 Vite 与 public scripts
**Reason**: Jest解耦阶段已完成，当前非测试边界由Vitest迁移契约继续保护。
**Migration**: 使用 `web-admin-vitest-toolchain` 的非单测工具链兼容requirement。

### Requirement: React 18 测试渲染使用维护中的 createRoot 路径
**Reason**: React 18 render/cleanup契约继续存在，但活动runner改为Vitest。
**Migration**: 在Vitest下通过dynamic import、局部module reset与Testing Library兼容测试验证createRoot/cleanup。

### Requirement: React 18 测试异步提交保持可审计
**Reason**: warning与异步提交审计迁移到non-silent Vitest。
**Migration**: 保留findBy/waitFor/await交互与局部warning guard，禁止任何全局suppression。

### Requirement: fake timer 只推进其拥有的异步任务
**Reason**: fake timer owner迁移到 `vi` API。
**Migration**: 使用Vitest fake timer与async timer API，并在React act内推进和恢复real timers。
