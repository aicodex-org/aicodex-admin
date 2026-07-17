## MODIFIED Requirements

### Requirement: web-admin 全量 Jest 基线稳定
仓库 SHALL 提供可重复执行的非watch Jest入口，并且当前提交的全部 `web-admin` Jest suite SHALL 在默认单测timeout下通过。测试 SHALL 验证用户可观察行为、公共组件对外属性或语义class token，不得把无语义的源码token顺序或已经封装的内部包装结构当作业务契约。

#### Scenario: 本地执行全量 CI 测试
- **WHEN** 开发者在 `web-admin`目录执行 `bun run test:ci`
- **THEN** Jest SHALL 以非watch模式完成全部已提交suite
- **AND** 结果 SHALL 不包含失败或超时测试

#### Scenario: 公共壳内部结构调整
- **WHEN** 公共列表壳或编辑壳保持对外class token与业务属性语义，但调整内部wrapper或token顺序
- **THEN** 业务页面测试 SHALL 不因无语义内部结构变化失败
- **AND** 公共组件自身测试 SHALL 继续覆盖公共wrapper契约

### Requirement: CI 显式执行前端静态与测试门禁
GitHub Actions SHALL 在pull request和受控push中通过Bun runner显式执行app/build-tooling typecheck、增量TypeScript gate、public scripts check/build/smoke、非修改式production-source lint和全量Jest。production-source lint SHALL 排除未进入production build graph的 `*.test.*`，单元测试行为 SHALL 继续由全量Jest覆盖。独立E2E job SHALL 显式执行Playwright E2E TypeScript检查与完整Chromium suite，并 SHALL 使用一次性数据库；只安装浏览器、只执行discovery或跳过写入型测试不得视为通过。前端checks SHALL 与Go tests并行取得结果，frontend build SHALL 仅在两类门禁成功后继续，并 SHALL 使用唯一默认Vite production build；release流程 SHALL 继续依赖E2E job成功。

#### Scenario: Pull request 触发前端 checks
- **WHEN** GitHub Actions处理pull request
- **THEN** frontend checks SHALL 使用pull request base SHA运行增量TypeScript gate
- **AND** SHALL 通过 `bun run`运行app/build-tooling typecheck、public scripts check/build/smoke、非修改production-source lint与全量Jest
- **AND** Linux依赖安装 SHALL 调用统一frozen安装入口
- **AND** 任一命令失败 SHALL 阻止frontend build job

#### Scenario: Push 触发前端 checks
- **WHEN** GitHub Actions处理受控分支push
- **THEN** frontend checks SHALL 优先使用push before SHA作为增量gate base
- **AND** before SHA无效时 SHALL 回退到 `HEAD^`
- **AND** SHALL 运行与pull request相同的显式门禁

#### Scenario: 前端门禁通过后构建交付产物
- **WHEN** Go tests与frontend checks均成功
- **THEN** frontend job SHALL 执行 `bun run build`
- **AND** build SHALL 生成 `web-admin/build`供artifact、release与Docker流程消费

#### Scenario: E2E job 运行 Playwright Chromium
- **WHEN** GitHub Actions执行E2E job
- **THEN** job SHALL 使用Bun Linux frozen安装入口、显式Chromium安装和项目Playwright scripts
- **AND** job SHALL 启动只连接一次性数据库的Admin backend与 `7002` Vite webServer
- **AND** 22个Playwright test中任一失败 SHALL 使E2E job失败
- **AND** release流程 SHALL NOT 在E2E job失败时继续

#### Scenario: E2E 失败保留有限诊断
- **WHEN** Playwright Chromium run失败
- **THEN** workflow SHALL 上传本次一次性fixture的report、trace和screenshot
- **AND** 工件 SHALL 有有限保留期且verification SHALL 不复制credential、Cookie、token、私有URL或原始响应体
