# web-admin-test-baseline-and-ci-gates Specification

## Purpose
定义 `web-admin` 的稳定 Jest 回归基线、低脆弱性测试约束，以及 CI 必须执行的 TypeScript、Jest 与 Playwright E2E 门禁。
## Requirements
### Requirement: web-admin 全量 Jest 基线稳定
仓库 SHALL 提供可重复执行的非 watch Jest 入口，并且当前提交的全部 `web-admin` Jest suite SHALL 在默认单测 timeout 下通过。测试 SHALL 验证用户可观察行为、公共组件对外属性或语义 class token，不得把无语义的源码 token 顺序或已经封装的内部包装结构当作业务契约。

#### Scenario: 本地执行全量 CI 测试
- **WHEN** 开发者在 `web-admin` 目录执行 `yarn test:ci`
- **THEN** Jest SHALL 以非 watch 模式完成全部已提交 suite
- **AND** 结果 SHALL 不包含失败或超时测试

#### Scenario: 公共壳内部结构调整
- **WHEN** 公共列表壳或编辑壳保持对外 class token 与业务属性语义，但调整内部 wrapper 或 token 顺序
- **THEN** 业务页面测试 SHALL 不因无语义内部结构变化失败
- **AND** 公共组件自身测试 SHALL 继续覆盖公共 wrapper 契约

### Requirement: 异步测试使用确定完成条件
涉及 async backend mock、legacy class state 或回调的 Jest 测试 SHALL 等待明确 promise、状态或回调完成条件。对于未返回 backend promise 的 legacy 页面方法，测试 SHALL 捕获并等待 mock backend request promise，再刷新后续 microtask，而不是为测试修改生产方法签名。测试不得仅通过提高全局 timeout 掩盖串行轮询、跨职责 mega test 或未完成异步任务。

#### Scenario: 多分支异步测试超时
- **WHEN** 单个测试串联多个独立对象或大量成功/失败分支并超过默认 timeout
- **THEN** 测试 SHALL 按职责拆分为可独立完成的场景
- **AND** 测试 SHALL 等待可捕获的 backend request promise 与后续 microtask
- **AND** 每个场景 SHALL 在默认 timeout 下稳定通过

### Requirement: CI 显式执行前端静态与测试门禁
GitHub Actions SHALL 在 pull request 和受控 push 中显式执行 `yarn typecheck`、`yarn typecheck:build-tooling`、增量 TypeScript gate、public scripts check/build/smoke、非修改式 production-source `yarn lint` 和 `yarn test:ci`。production-source lint SHALL 排除未进入 production build graph 的 `*.test.*`，单元测试行为 SHALL 继续由全量 Jest 覆盖。独立 E2E job SHALL 显式执行 Playwright E2E TypeScript 检查与完整 Chromium suite，并 SHALL 使用一次性数据库；只安装浏览器、只执行 discovery 或跳过写入型测试不得视为通过。前端 checks SHALL 与 Go tests 并行取得结果，frontend build SHALL 仅在两类门禁成功后继续，并 SHALL 使用唯一默认 Vite production build；release 流程 SHALL 继续依赖 E2E job 成功。

#### Scenario: Pull request 触发前端 checks
- **WHEN** GitHub Actions 处理 pull request
- **THEN** frontend checks SHALL 使用 pull request base SHA 运行增量 TypeScript gate
- **AND** SHALL 运行 app/build-tooling typecheck、public scripts check/build/smoke、非修改 production-source lint 与全量 Jest
- **AND** 任一命令失败 SHALL 阻止 frontend build job

#### Scenario: Push 触发前端 checks
- **WHEN** GitHub Actions 处理受控分支 push
- **THEN** frontend checks SHALL 优先使用 push before SHA 作为增量 gate base
- **AND** before SHA 无效时 SHALL 回退到 `HEAD^`
- **AND** SHALL 运行与 pull request 相同的显式门禁

#### Scenario: 前端门禁通过后构建交付产物
- **WHEN** Go tests 与 frontend checks 均成功
- **THEN** frontend job SHALL 执行 `yarn build`
- **AND** build SHALL 生成 `web-admin/build` 供 artifact、release 与 Docker 流程消费

#### Scenario: E2E job 运行 Playwright Chromium
- **WHEN** GitHub Actions 执行 E2E job
- **THEN** job SHALL 使用 Yarn frozen install、显式 Chromium 安装和项目 Playwright scripts
- **AND** job SHALL 启动只连接一次性数据库的 Admin backend 与 `7002` Vite webServer
- **AND** 22 个 Playwright test 中任一失败 SHALL 使 E2E job 失败
- **AND** release 流程 SHALL NOT 在 E2E job 失败时继续

#### Scenario: E2E 失败保留有限诊断
- **WHEN** Playwright Chromium run 失败
- **THEN** workflow SHALL 上传本次一次性 fixture 的 report、trace 和 screenshot
- **AND** 工件 SHALL 有有限保留期且 verification SHALL 不复制 credential、Cookie、token、私有 URL 或原始响应体

### Requirement: 测试基线修复保持生产行为兼容
测试工具链与基线 change SHALL 保持现有生产页面、路由、权限、后端请求契约和用户可见行为兼容。为使 Jest 脱离 React Scripts，change MAY 将当前实际使用的 Jest、Babel transform、jsdom、module mapper 与 watch plugin 固定为显式开发依赖并更新 `yarn.lock`，但 SHALL NOT 新增或升级 React、React Router、Testing Library、业务运行时依赖或 production build 工具链。

#### Scenario: 验证 Jest 解耦 change 写集
- **WHEN** review Jest 解耦 change 的最终 diff
- **THEN** 实现写集 SHALL 限于 Jest config/transform/mock、测试与测试 scripts、必要的测试开发依赖/lockfile、frontend Jest CI step 和 OpenSpec artifacts
- **AND** `react-scripts` 及只为其服务的重复 package 配置 SHALL 被移除
- **AND** 生产组件、Vite `start/build`、public scripts、Go tests、backend/integration/linter jobs SHALL 无行为修改
- **AND** `yarn.lock` 变化 SHALL 只对应显式测试依赖、React Scripts 移除及其不再被其它 owner 使用的传递依赖
