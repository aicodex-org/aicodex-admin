## ADDED Requirements

### Requirement: web-admin 使用显式 Vitest 单一测试工具链
`web-admin` SHALL 使用精确 `vitest@4.1.10` 与仓库自有 typed config 执行单元测试，SHALL NOT 在最终候选中保留 Jest runner、Jest config、`@jest/globals` alias、global `jest = vi` 或 `bun test` 入口。Vitest SHALL 使用 Vite transform 生态而不是测试专属 Babel transform。

#### Scenario: 转换 TypeScript 与 React 测试
- **WHEN** Vitest 加载 `.ts`、`.tsx`、`.js`、`.jsx`、`.mjs` 或 `.cjs` 测试及依赖模块
- **THEN** typed Vitest config SHALL 解析 TypeScript、automatic JSX runtime、dynamic import 与项目现有 CommonJS 互操作
- **AND** 配置 SHALL NOT 改变 Vite production build 的 target、proxy、base 或产物目录

#### Scenario: 审计最终 runner 单一真值
- **WHEN** release candidate 检查 package、lock、config、tests、CI 与活动主规格
- **THEN** `bun run test` 与 `bun run test:ci` SHALL 只调用 Vitest
- **AND** Jest 27、`@jest/globals`、Jest environment/watch/transform/support 与活动 Jest runner requirements SHALL 不再存在

### Requirement: Vitest 浏览器测试环境与 setup 版本可复现
Vitest SHALL 使用精确 `jsdom@28.1.0` 和 `@testing-library/jest-dom@6.9.1`，仓库Node engines SHALL 收窄为Vite/Vitest/jsdom共同兼容的 `^20.19.0 || ^22.12.0 || >=24.0.0`，并 SHALL 在断言前加载typed setup。

#### Scenario: 初始化 jsdom 与 matcher
- **WHEN** Vitest 启动任一 DOM 或 React suite
- **THEN** environment SHALL 为 jsdom 且 URL SHALL 固定为 `http://localhost`
- **AND** `window`、`document`、storage、`matchMedia` 与 jest-dom matcher SHALL 可用
- **AND** setup SHALL 使用 `@testing-library/jest-dom/vitest`，不得使用已退役 `extend-expect` 入口

#### Scenario: 依赖版本满足 Node 下界
- **WHEN** 安装器校验 Vitest 与 jsdom direct dependencies
- **THEN** jsdom engines SHALL 覆盖 Node 20.19.0 与 22.12.0
- **AND** package SHALL NOT 接纳Vitest不支持的Node 23或使用要求Node 22.13.0的jsdom latest浮动版本

### Requirement: Vitest discovery 保留完整测试基线
Vitest SHALL 发现迁移前 Jest 在最新 base 发现的全部 157 条规范化测试路径，SHALL NOT 通过 exclude、删测、skip/only、0-test success、扩大 mock 或降级 transform 制造通过。

#### Scenario: 对照迁移前后测试路径
- **WHEN** 在同一 base 分别执行 Jest 与 Vitest discovery 并规范化为 repo-relative path
- **THEN** Vitest path 集合 SHALL 包含全部 157 条 Jest 基线路径
- **AND** 任何新增路径 SHALL 对应本 change 的有效直接契约测试
- **AND** 任何基线路径缺失 SHALL 阻止 release candidate

#### Scenario: CI 未发现测试
- **WHEN** `bun run test:ci` 因配置错误发现 0 tests
- **THEN** 命令 SHALL 以非零状态失败
- **AND** package 与 CI SHALL NOT 使用 `--passWithNoTests`

### Requirement: 开发与 CI 入口保持串行且 non-silent
`web-admin` SHALL 提供 Vitest watch 开发入口和确定性的 `vitest run` CI 入口。初始迁移 SHALL 使用单 worker、文件串行、非 concurrent case 语义，并 SHALL 保持 console warning 可见。

#### Scenario: 开发者运行 bun run test
- **WHEN** 开发者在 Git workspace 执行 `bun run test`
- **THEN** Vitest SHALL 进入 watch 体验并发现非零测试
- **AND** 开发诊断 SHALL NOT 被全局 silent 配置隐藏

#### Scenario: CI 运行全量 Vitest
- **WHEN** CI 或开发者执行 `bun run test:ci`
- **THEN** Vitest SHALL 使用非 watch、单 worker和文件串行配置执行全部 suite
- **AND** 命令 SHALL 不包含 `--silent`、`--passWithNoTests` 或并行化覆盖参数
- **AND** 任一 failure、timeout、unhandled error 或配置错误 SHALL 使命令失败

### Requirement: 样式与资产模块具有稳定测试替身
Vitest test-only config SHALL 为普通 style、CSS Modules、通用资产与 SVG 分别提供可维护的 support，并 SHALL 保持现有测试所需的模块导出语义而不修改 production Vite config。

#### Scenario: 测试导入样式与普通资产
- **WHEN** 被测模块导入 CSS/Less、CSS/Less Modules 或普通静态资产
- **THEN** 普通 style SHALL 返回空 style module
- **AND** style modules SHALL 返回稳定 class-name proxy
- **AND** 普通资产 SHALL 返回确定性 file stub

#### Scenario: 测试导入 SVG
- **WHEN** 被测模块通过 default export 或 `ReactComponent` named export 导入 SVG
- **THEN** SVG support SHALL 同时提供稳定 default filename 与可渲染 React component stub

### Requirement: mock hoist、ESM/CJS 与 module cache 迁移保持行为
Vitest 迁移 SHALL 使用显式 `vi` API保留 module mock、partial mock、dynamic import、CommonJS fixture 与 cache reset 所验证的行为，SHALL NOT 通过全局 alias 或 module-cache 清空改变无关 suite。

#### Scenario: 执行 hoisted module mock
- **WHEN** 测试使用 module mock factory
- **THEN** factory SHALL 使用静态 `vi` import或 `vi.hoisted` 获取 hoisted state
- **AND** factory SHALL NOT 动态 require `@jest/globals` 或读取未初始化的外层变量

#### Scenario: 执行 partial mock 与 module isolation
- **WHEN** 测试需要真实 exports 或隔离重新加载模块
- **THEN** partial mock SHALL 使用 async `vi.importActual`
- **AND** cache isolation SHALL 使用局部 `vi.resetModules`、dynamic import 与显式 cleanup
- **AND** 实现 SHALL NOT 假设 Vitest 提供 `vi.isolateModules`

#### Scenario: 迁移 CommonJS 路径辅助
- **WHEN** ESM 测试需要原 `require` 或 `__dirname` 所表达的能力
- **THEN** 静态依赖 SHALL 优先改为 import，重新加载 SHALL 使用 dynamic import
- **AND** Node fixture SHALL 仅在必要 owner 使用 `createRequire(import.meta.url)` 或 `fileURLToPath(import.meta.url)`
- **AND** 全局 require 或 `__dirname` shim SHALL 不存在

### Requirement: mock reset 与 fake timer 语义保持可审计
Vitest SHALL 对应当前 `resetMocks: true` 配置显式启用 mock reset，并 SHALL 让 fake timer owner 只推进其拥有的 timer、microtask 与 React update，测试结束恢复 real timers。

#### Scenario: 每个测试重置 mock
- **WHEN** 相邻测试复用 module mock、spy 或 mock implementation
- **THEN** mock call state 与实现 SHALL 按既有契约重置
- **AND** 代表性 suite SHALL 直接验证 Vitest reset/restore差异未造成跨 test 污染

#### Scenario: fake timer owner 推进异步任务
- **WHEN** 测试验证 polling、debounce、interval、timeout 或 system time
- **THEN** fake timers SHALL 在目标 timer 创建前启用
- **AND** timer 与后续 microtask/React 提交 SHALL 在断言前完成
- **AND** suite SHALL 恢复 real timers且不输出 FakeTimers/native timer 提示

### Requirement: React 18 异步 warning 保持可见
Vitest 全量与聚焦运行 SHALL 保持 React act、FakeTimers/native timer、AntD/runtime 与其它 console warning 的原始可见性。迁移 SHALL NOT 使用 setup/config suppression、按文本吞错、空 `act`、任意 sleep 或提高 timeout 隐藏未完成更新。

#### Scenario: non-silent 全量审计
- **WHEN** 开发者以固定环境、non-silent、非 watch、单 worker执行全量 Vitest
- **THEN** 全部 suite/test SHALL 以 0 failure 完成且测试数 SHALL 不少于 1503
- **AND** 迁移 owner 的 act 与 fake timer warning SHALL 不回退
- **AND** 其它 warning SHALL 不因新增过滤而消失

#### Scenario: 局部 warning guard
- **WHEN** 测试使用局部 console spy 防止 owner warning 回退
- **THEN** guard SHALL 保留原始 console 行为并在断言后恢复 spy
- **AND** guard SHALL NOT 写入 Vitest global setup/config或吞掉其它类别

### Requirement: Vitest coverage 保持可审计输出契约
Vitest SHALL 使用精确 coverage provider，显式收集 `src` production JS/JSX/TS/TSX，排除声明与测试文件，并 SHALL 输出既有 text、JSON、LCOV 与 Clover 报告到 ignored `coverage` 目录。

#### Scenario: 收集 production source coverage
- **WHEN** 开发者执行 Vitest coverage 入口
- **THEN** coverage SHALL 包含未被测试直接 import 的 production source
- **AND** `.d.ts`、`*.test.*`、`*.spec.*` 与 `__tests__` SHALL 不作为 production coverage target
- **AND** text、json、lcov、clover报告 SHALL 均可生成和审计

#### Scenario: coverage provider 兼容消费者
- **WHEN** V8 provider生成的text、json、lcov或clover不能被仓库已有消费者读取
- **THEN** release candidate SHALL 被阻止并先修订OpenSpec设计
- **AND** 实现 SHALL NOT 未经设计更新自动切换provider或通过恢复Jest coverage形成双runner

### Requirement: Vitest 迁移不改变非单测工具链
Vitest 迁移 SHALL 保持 app/build-tooling/E2E typecheck、增量 TypeScript、production lint、public scripts、Vite build 与 Playwright 19 files / 22 tests discovery 可执行，并 SHALL 不改变 production source 或 60 环境。

#### Scenario: 验证前端非单测门禁
- **WHEN** release candidate 完成单元 runner迁移
- **THEN** app/build-tooling/E2E typecheck、增量TS、lint、public scripts与Vite build SHALL 通过
- **AND** Playwright discovery SHALL 保持19 files / 22 tests且无skip/only
- **AND** 验证 SHALL NOT 部署或访问60

#### Scenario: 审计生产边界
- **WHEN** review最终diff
- **THEN** production页面、路由、API、Go/backend/schema/auth/provider、Docker、Makefile、Playwright实现与构建产物契约 SHALL 无行为修改
