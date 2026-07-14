## ADDED Requirements

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
GitHub Actions SHALL 在 pull request 和受控 push 中显式执行 `yarn typecheck`、增量 TypeScript gate 和 `yarn test:ci`。前端 checks SHALL 与 Go tests 并行取得结果，frontend build SHALL 仅在两类门禁成功后继续。

#### Scenario: Pull request 触发前端 checks
- **WHEN** GitHub Actions 处理 pull request
- **THEN** frontend checks SHALL 使用 pull request base SHA 运行增量 TypeScript gate
- **AND** SHALL 运行 `yarn typecheck` 与 `yarn test:ci`
- **AND** 任一命令失败 SHALL 阻止 frontend build job

#### Scenario: Push 触发前端 checks
- **WHEN** GitHub Actions 处理受控分支 push
- **THEN** frontend checks SHALL 优先使用 push before SHA 作为增量 gate base
- **AND** before SHA 无效时 SHALL 回退到 `HEAD^`
- **AND** SHALL 运行与 pull request 相同的 typecheck 和 Jest 门禁

### Requirement: 测试基线修复保持生产行为兼容
本 change SHALL 保持现有生产页面、路由、权限、后端请求契约和用户可见行为兼容，并 SHALL 不新增或升级运行时/测试依赖。

#### Scenario: 验证 change 写集
- **WHEN** review 本 change 最终 diff
- **THEN** 实现写集 SHALL 限于 Jest 测试、测试脚本、CI workflow 和 OpenSpec artifacts
- **AND** `yarn.lock` SHALL 保持不变
- **AND** 生产组件 SHALL 无行为修改
