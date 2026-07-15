## MODIFIED Requirements

### Requirement: CI 显式执行前端静态与测试门禁
GitHub Actions SHALL 在 pull request 和受控 push 中显式执行 `yarn typecheck`、`yarn typecheck:build-tooling`、增量 TypeScript gate、public scripts check/build/smoke、非修改式 production-source `yarn lint` 和 `yarn test:ci`。production-source lint SHALL 排除未进入 production build graph 的 `*.test.*`，测试行为 SHALL 继续由全量 Jest 覆盖。前端 checks SHALL 与 Go tests 并行取得结果，frontend build SHALL 仅在两类门禁成功后继续，并 SHALL 使用唯一默认 Vite production build。

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
