## MODIFIED Requirements

### Requirement: web-admin 全量 Vitest 基线稳定
仓库 SHALL 提供可重复执行的non-watch Vitest入口，并且当前提交的全部 `web-admin` unit suite SHALL 在默认单测timeout下通过。测试 SHALL 验证用户可观察行为、公共组件对外属性或语义class token，不得把无语义的源码token顺序或已经封装的内部包装结构当作业务契约。

#### Scenario: 本地执行全量 CI 测试
- **WHEN** 开发者在 `web-admin`目录执行 `bun run test:ci`
- **THEN** Vitest SHALL 以non-watch、single-worker、file-serial模式完成全部已提交suite
- **AND** SHALL 发现迁移前全部157条规范化测试路径、执行不少于1503个test且0 failure
- **AND** 结果 SHALL 不包含timeout、unhandled error或0-test success

#### Scenario: 公共壳内部结构调整
- **WHEN** 公共列表壳或编辑壳保持对外class token与业务属性语义，但调整内部wrapper或token顺序
- **THEN** 业务页面测试 SHALL 不因无语义内部结构变化失败
- **AND** 公共组件自身测试 SHALL 继续覆盖公共wrapper契约

#### Scenario: runner迁移保持路径集合
- **WHEN** 开发者规范化同一base的Jest与Vitest discovery path集合
- **THEN** Vitest集合 SHALL 对157条Jest基线路径保持157/157无缺失
- **AND** 任何新增路径 SHALL 对应本change新增的有效toolchain contract test
- **AND** 删除测试、skip/only、exclude、扩大mock或`passWithNoTests` SHALL 阻止release candidate

### Requirement: 异步测试使用确定完成条件
涉及 async backend mock、legacy class state、回调、dynamic import或timer的Vitest测试 SHALL 等待明确promise、状态、DOM、timer或回调完成条件。对于未返回backend promise的legacy页面方法，测试 SHALL 捕获并等待mock backend request promise，再刷新后续microtask，而不是为测试修改production方法签名。测试不得仅通过提高全局timeout、任意sleep、全局timer cleanup或warning suppression掩盖串行轮询、跨职责mega test或未完成异步任务。

#### Scenario: 多分支异步测试超时
- **WHEN** 单个测试串联多个独立对象或大量成功/失败分支并超过默认timeout
- **THEN** 测试 SHALL 按职责拆分为可独立完成的场景
- **AND** 测试 SHALL 等待可捕获的backend request promise与后续microtask
- **AND** 每个场景 SHALL 在默认timeout下稳定通过

#### Scenario: fake timer 与 React update 完成
- **WHEN** 测试通过Vitest fake timers推进polling、debounce、interval或timeout
- **THEN** timer与后续microtask/React提交 SHALL 在断言和cleanup前完成
- **AND** suite SHALL 恢复real timers且不输出act或FakeTimers/native timer owner warning

### Requirement: CI 显式执行前端静态与测试门禁
GitHub Actions SHALL 在pull request和受控push中通过Bun runner显式执行app/build-tooling typecheck、增量TypeScript gate、public scripts check/build/smoke、非修改式production-source lint和全量Vitest。production-source lint SHALL 排除未进入production build graph的 `*.test.*`，unit行为 SHALL 由全量Vitest覆盖。独立E2E job SHALL 显式执行Playwright E2E TypeScript检查与完整Chromium suite，并 SHALL 使用一次性数据库；只安装浏览器、只执行discovery或跳过写入型测试不得视为通过。前端checks SHALL 与Go tests并行取得结果，frontend build SHALL 仅在两类门禁成功后继续，并 SHALL 使用唯一默认Vite production build；release流程 SHALL 继续依赖E2E job成功。

#### Scenario: Pull request 触发前端 checks
- **WHEN** GitHub Actions处理pull request
- **THEN** frontend checks SHALL 使用pull request base SHA运行增量TypeScript gate
- **AND** SHALL 通过 `bun run`运行app/build-tooling typecheck、public scripts check/build/smoke、非修改production-source lint与全量non-silent Vitest
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

### Requirement: 测试基线修复保持生产行为兼容
测试工具链与基线change SHALL 保持现有production页面、路由、权限、backend request契约和用户可见行为兼容。Vitest迁移 MAY 更新unit config/setup/support、测试文件、必要test dev dependencies、`bun.lock`、直接toolchain contract tests、frontend unit CI step和活动OpenSpec/docs真值；此类change SHALL NOT新增或升级React、React Router、Vite、TypeScript、Playwright、业务运行时依赖或production build工具链。

#### Scenario: 验证Vitest迁移写集
- **WHEN** review Jest到Vitest迁移change的最终diff
- **THEN** 实现写集 SHALL 限于package/lock、Vitest config/setup/support、tests/test scripts、必要测试依赖、frontend unit CI step、toolchain docs与OpenSpec artifacts
- **AND** production组件、Vite `start/build`、public scripts、Go tests、backend/integration/linter jobs SHALL 无行为修改
- **AND** `bun.lock`变化 SHALL 只对应批准的Vitest/jsdom/jest-dom/coverage依赖以及不再被其它owner使用的Jest/Babel/asset依赖

#### Scenario: 审计测试依赖 owner
- **WHEN** 删除Jest与Babel/asset support dependencies
- **THEN** Jest 27、`@jest/globals`、`babel-jest`、`jest-environment-jsdom`与`jest-watch-typeahead` SHALL 被移除
- **AND** Babel parser/preset、CSS Modules、SVG与asset依赖 SHALL 在删除前逐项证明无ESLint、Vite、coverage或其它活动owner

### Requirement: React 测试工具链升级保持 discovery 与诊断完整
React测试工具链升级或runner迁移 SHALL 保留既有unit与Playwright discovery、测试行为和断言强度。迁移 SHALL NOT通过删除或合并测试、`skip`/`only`、扩大mock、延长timeout、全局console ignore、silent或局部warning filter制造通过；与本次runner迁移无关的warning SHALL 保持可审计。

#### Scenario: 对照升级前后 unit 基线
- **WHEN** 开发者完成Vitest迁移并执行全量 `bun run test:ci`
- **THEN** Vitest SHALL 发现全部157条基线path并执行至少1503个test
- **AND** 所有已发现测试 SHALL 以0 failure完成
- **AND** 旧discovery路径 SHALL 无缺失

#### Scenario: 审计 legacy root 与 act 告警
- **WHEN** 开发者使用non-silent Vitest命令运行React 18代表性和全量回归
- **THEN** `ReactDOM.render is no longer supported`告警计数 SHALL 保持0
- **AND** 迁移owner的`not wrapped in act`与FakeTimers/native timer warning SHALL 不回退
- **AND** 测试setup、Vitest config与目标测试文件 SHALL 不包含相关suppression

#### Scenario: 保持 Playwright 与 production 工具链边界
- **WHEN** Vitest依赖和测试迁移完成
- **THEN** Playwright discovery SHALL 保持19个spec与22个test
- **AND** app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts与Vite build SHALL 继续通过
- **AND** Vite、Playwright、production组件和业务运行时依赖 SHALL 无行为修改

### Requirement: non-silent Vitest 审计治理后的异步 warning
测试异步边界change和runner迁移 SHALL 使用固定test环境、non-silent、非watch、单worker、文件串行的全量Vitest，对React act、FakeTimers/native timer、AntD/runtime和其它console warning分类。验证记录 SHALL 只保留脱敏计数、top owner和处理结论，不提交原始长日志。

#### Scenario: 对照治理前后 warning
- **WHEN** 开发者完成Vitest迁移并运行non-silent全量unit tests
- **THEN** 全部已发现suite/test SHALL 以0 failure完成且discovery/test count SHALL 不低于157/1503基线
- **AND** 治理owner的act warning与FakeTimers/native timer提示 SHALL 为0
- **AND** 第三方或production owner的保留warning SHALL 按类别说明，不得因新增suppression消失

#### Scenario: 单 suite 绿灯不能替代跨 suite 泄漏验证
- **WHEN** 某个owner单独运行时warning为0，但完整串行运行暴露卸载后promise、timer或React更新
- **THEN** change SHALL 以相邻suite或完整non-silent运行建立RED/GREEN证据
- **AND** SHALL NOT 把单suite退出前未触发的warning解释为异步边界已完成

#### Scenario: CI 保留 warning 可见性
- **WHEN** GitHub Actions执行 `bun run test:ci`
- **THEN** script与Vitest config SHALL 不启用silent或console filter
- **AND** warning SHALL 在CI日志中保持可观察，任一unhandled error SHALL 使job失败

## RENAMED Requirements

- FROM: `### Requirement: web-admin 全量 Jest 基线稳定`
- TO: `### Requirement: web-admin 全量 Vitest 基线稳定`
- FROM: `### Requirement: non-silent Jest 审计治理后的异步 warning`
- TO: `### Requirement: non-silent Vitest 审计治理后的异步 warning`
