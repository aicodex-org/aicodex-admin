# web-admin-test-baseline-and-ci-gates Specification

## Purpose
定义 `web-admin` 的稳定 Jest 回归基线、低脆弱性测试约束，以及 CI 必须执行的 TypeScript、Jest 与 Playwright E2E 门禁。
## Requirements
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

### Requirement: 异步测试使用确定完成条件
涉及 async backend mock、legacy class state 或回调的 Jest 测试 SHALL 等待明确 promise、状态或回调完成条件。对于未返回 backend promise 的 legacy 页面方法，测试 SHALL 捕获并等待 mock backend request promise，再刷新后续 microtask，而不是为测试修改生产方法签名。测试不得仅通过提高全局 timeout 掩盖串行轮询、跨职责 mega test 或未完成异步任务。

#### Scenario: 多分支异步测试超时
- **WHEN** 单个测试串联多个独立对象或大量成功/失败分支并超过默认 timeout
- **THEN** 测试 SHALL 按职责拆分为可独立完成的场景
- **AND** 测试 SHALL 等待可捕获的 backend request promise 与后续 microtask
- **AND** 每个场景 SHALL 在默认 timeout 下稳定通过

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

### Requirement: 测试基线修复保持生产行为兼容
测试工具链与基线 change SHALL 保持现有生产页面、路由、权限、后端请求契约和用户可见行为兼容。为使 Jest 脱离 React Scripts，change MAY 将当前实际使用的 Jest、Babel transform、jsdom、module mapper 与 watch plugin 固定为显式开发依赖并更新 `yarn.lock`；专用于 React 18 测试渲染兼容的 change MAY 在 peer 约束相容且完整质量门禁通过时升级 Testing Library 及其必要 peer dev dependency。此类 change SHALL NOT 新增或升级 React、React Router、业务运行时依赖或 production build 工具链。

#### Scenario: 验证测试工具链 change 写集
- **WHEN** review Jest 解耦或 React 18 Testing Library 兼容 change 的最终 diff
- **THEN** 实现写集 SHALL 限于 Jest config/transform/mock、测试与测试 scripts、必要的测试开发依赖/lockfile、适用的 frontend Jest CI step 和 OpenSpec artifacts
- **AND** 生产组件、Vite `start/build`、public scripts、Go tests、backend/integration/linter jobs SHALL 无行为修改
- **AND** `yarn.lock` 变化 SHALL 只对应显式测试依赖及其不再被其它 owner 使用的传递依赖

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

### Requirement: non-silent Jest 审计治理后的异步 warning
测试异步边界 change SHALL 使用固定 test 环境、non-silent、非 watch、`--runInBand` 全量 Jest 对 React act、FakeTimers/native timer、AntD/runtime 和其它 console warning 分类。验证记录 SHALL 只保留脱敏计数、top owner 和处理结论，不提交原始长日志。

#### Scenario: 对照治理前后 warning
- **WHEN** 开发者完成 React 18 测试异步边界治理并运行 non-silent 全量 Jest
- **THEN** 全部已发现 suite/test SHALL 以 0 failure 完成且 discovery SHALL 不低于变更前最新基线
- **AND** 治理 owner 的 act warning 与 FakeTimers/native timer 提示 SHALL 为 0
- **AND** 第三方或生产 owner 的保留 warning SHALL 按类别说明，不得因新增 suppression 消失

#### Scenario: 单 suite 绿灯不能替代跨 suite 泄漏验证
- **WHEN** 某个 owner 单独运行时 warning 为 0，但完整串行运行暴露卸载后 promise、timer 或 React 更新
- **THEN** change SHALL 以相邻 suite 或完整 non-silent 运行建立 RED/GREEN 证据
- **AND** SHALL NOT 把单 suite 退出前未触发的 warning 解释为异步边界已完成
