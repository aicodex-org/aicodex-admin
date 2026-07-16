## MODIFIED Requirements

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
