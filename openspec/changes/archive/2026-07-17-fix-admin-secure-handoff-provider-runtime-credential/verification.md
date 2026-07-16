## 当前结论

本 change 已完成 secure-handoff Provider runtime credential、可信 target organization、current-user `MISSING` 诊断语义和 Admin 组织选择器的源码实现。RC 阶段基于当时的 `origin/hfl-test-base@dcf7f009` 已取得聚焦/全仓Go、changed production statements coverage、Go build/vet/lint、前端incremental TypeScript/typecheck/Jest/build、OpenSpec strict与diff gate通过证据；closeout 阶段会在最新 base 上重跑 OpenSpec、diff check 与聚焦门禁。

rebase前全仓hermetic Go suite曾因写集外schema migration并发测试在Windows/SQLite上等待到10分钟timeout而失败；同一测试隔离运行和`object`全包运行均通过。清空共享测试进程并rebase最新base后，原始全仓命令已完整通过。本文同时保留失败与最终复验证据，不把历史失败改写为通过。

主控已在 60 环境完成脱敏 E2E：Admin `5915c0bb`、Insight `23c92c8a`、API `9e462f74` 的部署矩阵 healthy；新 Profile `2196bf8b` 已启用，dry-run 与 doctor 均通过，Admin owner/API usage/Gateway authorization 三组件均为 `bound + secure_handoff_confirmed`。本文不记录 token、Cookie、raw package、credential、完整 secretRef、私有URL或raw row。

## 根因与安全语义

- 首轮根因：旧 issuer 只生成与 OAuth/Provider 认证无关的随机 `adm-*` material，`AutoSigninFilter` 又在 Provider controller 前把任意 Bearer 当作 OAuth token 查询，导致无效 token 被通用 HTTP 200 JSON 吞掉，Provider controller/audit 无法到达。
- 首轮修复：默认 issuer 改为带独立30天expiry的版本化高熵 opaque credential；redeem原子地把raw material替换为不可逆verifier，confirm后按grant当前状态、exact verifier、issuer/audience/scopes/subject/target/expiry持续验证；三个精确Provider路径进入专用filter分流，typed `insight_provider_trust`仍是最终授权边界。
- 60首轮脱敏证据继续暴露第二层契约缺口：credential可认证且Provider controller已到达，但built-in全局管理员被错误当作业务组织，current-user又把个人映射`MISSING`提升为503。主规格明确current-user允许`MISSING`诊断成功，真正报表授权边界是scope。
- 当前语义：全局管理员创建接入包时必须从Admin现有组织中显式选择非`built-in` target organization；服务端重新读取并校验组织，不接受自由输入推断、Insight query、workspace alias或默认built-in。
- 不修改已发布schema manifest。target organization进入`admrt_v2_` claim；`packageHash`同时绑定copy-safe metadata与target并持久化在grant record，exact material verifier阻止claim/secret篡改。验证后auth context携带target，Provider controller只能从该context消费组织。
- current-user保留真实签发者身份和个人usage identity，但organization、API organization与版本上下文使用可信target；个人本地映射或saved resolver unavailable且只能确认`MISSING`时返回HTTP 200诊断，不猜测`apiUserId`。`INVALID`/`AMBIGUOUS`及typed trust disabled/store unavailable/invalid继续fail closed。
- scope与organization-tree忽略handoff query，只在target organization计算；`ALL_COMPANY`/`DEPARTMENT_TREE`只包含confirmed正整数映射成员，`SELF`/`CUSTOM_USERS`必要映射缺失及任何`INVALID`/`AMBIGUOUS`继续fail closed。

## TDD RED / GREEN

- 首轮RED/GREEN继续有效：object覆盖runtime credential签发、redeem/confirm、并发一次性交付、跨实例verifier、过期、撤销、failed、未confirm、target/record/user篡改和raw不可恢复；routers以真实Beego register/filter/controller固定401/403 Provider envelope与普通JWT/非Provider兼容；controllers用真实redeem material固定current-user/scope链路。
- 续作RED先固定：current-user本地或resolver `MISSING`成功诊断；本地/远端`INVALID`/`AMBIGUOUS`继续拒绝；target缺失、built-in、不存在、lookup error、package binding/claim篡改拒绝；built-in签发者绑定业务组织后三个Provider路径统一使用credential target且query不能覆盖。
- 前端RED固定：候选加载、只有built-in、empty、error、未选择、提交中锁定与成功payload；selector不自由输入、不静默默认。选项标点与窄屏宽度断言也在实现调整前分别出现预期失败。
- GREEN：`go test ./object ./controllers ./routers -count=1 -vet=off -covermode=count -coverprofile=<ignored-profile>`通过；目标前端Jest 2个suite、32个测试通过。

## 自动化验证

- 受影响Go三包：object `43.0%`、controllers `21.5%`、routers `48.9%` package statements；这些大包整体数字只作为背景。
- changed production statements coverage：将三包coverprofile与`git diff --unified=0 origin/hfl-test-base`修改行相交，结果`245/286 = 85.66%`，达到`>=85%`。分文件为access-package controller `36/39`、Provider controller `51/73`、grant lifecycle `61/73`、runtime credential `71/73`、filter `26/28`。
- rebase前`GOTOOLCHAIN=go1.25.8 go test -count=1 -tags skipCi ./...`：`FAIL`。唯一失败为写集外`TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines`等待到包级10分钟timeout；该次结果不计为通过。
- `GOTOOLCHAIN=go1.25.8 go test ./object -run '^TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines$' -count=1 -tags skipCi -timeout 2m -v`：通过，目标测试`1.51s`。
- `GOTOOLCHAIN=go1.25.8 go test ./object -count=1 -tags skipCi -timeout 3m`：通过，package `16.666s`。上述两项不能替代失败的全仓命令，只用于定位并发/环境差异。
- rebase最新base并清空共享test binary后，`GOTOOLCHAIN=go1.25.8 go test -count=1 -tags skipCi ./...`：最终通过，全部package exit 0，object `14.022s`。
- `GOTOOLCHAIN=go1.25.8 go build main.go`：通过；生成的`main.exe`已删除且无residue。
- `GOTOOLCHAIN=go1.25.8 go vet ./...`：通过。
- `gofumpt -l <changed-go-files>`：无输出；固定`golangci-lint v2.11.4`最终执行`run --modules-download-mode=readonly ./...`返回`0 issues`。此前mod模式曾机械调整`go.mod`依赖分组，已恢复，任务diff不含`go.mod`。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn jest src/ApplicationUsageAccessPage.test.tsx src/ApplicationAccessCenter.test.tsx --watchAll=false --runInBand`：post-rebase 2个suite、32个测试全部通过。
- 目标生产TSX/backend ESLint：exit 0；仅有仓库既有Browserslist数据过期提示。
- `yarn build`：首次因本地`node_modules`缺少Vite失败；`yarn install --frozen-lockfile`补齐本地依赖且未修改package/lockfile后，最终build通过。输出保留仓库既有browser externalization、direct `eval`与chunk-size warnings。
- `openspec validate fix-admin-secure-handoff-provider-runtime-credential --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`：全部通过。
- `git diff --check`：通过。

## 运行态验收

- 60 部署矩阵：Admin `5915c0bb`、Insight `23c92c8a`、API `9e462f74`；相关容器 healthy。
- Profile 验收：主控重新复制 API/Admin 包，新建 Profile `2196bf8b` 并启用成功；previous Profile `d1c04e1f` 可回滚。
- 组件绑定：新 active Profile `2196bf8b` 的 dry-run 与 doctor 均为 `passed`；`api_usage`、`admin_owner`、`gateway_authorization` 均为 `bound + secure_handoff_confirmed`。
- TTL 事实：第一次导入同草稿时 API/Gateway 已 confirmed，但 Admin grant 因 TTL 过期返回 `secure_handoff_grant_expired`；立即重新复制未过期 Admin 包并补导入 `admin_owner` 后 dry-run、doctor、activate 全部通过。该事实是操作注意，不是代码 blocker。
- 用量复验：summary、timeseries、model-options 均为 HTTP 200/code 0；organization-tree 为 HTTP 200/code 0、`mappingStatus=OK`、`lifecycleStatus=ACTIVE`；by-user 为 HTTP 200/code 0/empty；by-department 为 HTTP 200/code 0、`total=3`、`rows=3`。
- 日志脱敏核验：近端日志 grep 未再命中 `grant_expired`、`UNAUTHORIZED_FILTER`、`UNAUTHENTICATED`、`ADMIN_SESSION_MISSING`、`AUTHORIZATION_FAILED` 的目标错误 alias；未输出 token、Cookie 或 raw secret。

## 归档前审查状态

- OpenSpec artifacts、delta specs、主规格对照、实现、测试、changed coverage、注释和脱敏记录已审查；新增自然语言以中文为主，英文仅保留Provider/API/字段/错误码/规范关键字等必要术语。
- 主规格将在archive时同步delta；当前不得提前手工改写主规格造成active change双写。
- 注释已补充target字段、package hash边界、服务端组织重验、handoff organization优先级、organization-tree source seam和UI不默认选择等非显然安全规则。
- archive准备状态为`READY`：主控60真实smoke已关闭运行态阻塞；closeout 阶段仍需完成archive后 strict validate、diff check、聚焦测试与base普通push。

## 剩余风险

- runtime credential为30天有界凭据，本change不提供自动refresh/rotation；到期需operator重新生成并交接。
- 旧v1 credential和缺target旧包将fail closed，升级后必须重新生成包。
- 当前Insight请求没有独立target attestation header；v2 claim、package binding、exact verifier和Provider audit提供应用层不可篡改/可追溯边界，但不声称远端硬件或网络级证明。
- 60 saved typed trust必须允许handoff audience/issuer/scopes；不匹配应保持403，不得用legacy fallback放宽。
- secure handoff grant TTL 较短，operator 复制后应及时导入并确认；过期时重新复制未过期 Admin 包，不复用旧包。
