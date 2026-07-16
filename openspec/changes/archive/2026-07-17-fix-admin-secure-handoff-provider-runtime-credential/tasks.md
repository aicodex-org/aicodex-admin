## 1. 基线、设计与实施门禁

- [x] 1.1 记录最新 `origin/hfl-test-base`、固定 workspace clean、active changes与60只读根因证据，确认不创建 worktree、不操作 `test`。
- [x] 1.2 调查 grant issuer/store/redeem/confirm、AutoSigninFilter、Provider controller/JWT/typed trust及Beego测试夹具，比较 OAuth JWT、无状态 JWT与持久化 opaque verifier方案。
- [x] 1.3 完成 proposal/design/delta specs/tasks，运行 target/changes/specs strict、`git diff --check`并完成 pre-implementation review至 implementation-ready。

## 2. 完整 HTTP 契约 RED

- [x] 2.1 新增隔离 Beego router/filter → Provider controller harness，并用默认issuer创建、redeem、confirm material建立current-user/scope controller契约；确认当前实现RED。
- [x] 2.2 添加任意错误 Bearer 测试，要求 HTTP 401、稳定 `InsightProviderEnvelope`、controller验证链实际到达，确认当前 HTTP 200通用错误行为 RED。
- [x] 2.3 添加未 confirm、过期、revoke、material/target篡改测试，要求稳定401/403且无 secret/raw material泄漏。
- [x] 2.4 添加 saved trust disabled、store unavailable、invalid resolution测试，要求有效 handoff credential仍 fail closed且不回退 legacy配置。

## 3. runtime credential issuer与生命周期 GREEN

- [x] 3.1 为创建请求增加仅服务端可注入的 subject/issued metadata，默认 issuer生成版本化高熵 runtime credential，绑定 issuer/audience/scopes/subject/target/grant/expiry。
- [x] 3.2 修改 redeem持久化：响应只返回一次 raw material，record原子替换为 verifier digest；confirm保留 verifier，status/package/operator响应不显示 material或digest。
- [x] 3.3 实现可注入 store/clock的 runtime validator，严格解析、常量时间 digest比较并校验 confirmed state、expiry、issuer/audience/scopes/subject/target；补跨实例、revoke、expired、wrong target与raw不可恢复object测试。

## 4. filter/controller集成 GREEN

- [x] 4.1 在 AutoSigninFilter 对三个精确 Provider路径执行专用 Bearer分流；handoff credential验证成功写只读 context，失败返回稳定401/403 envelope，普通 JWT显式交给 controller，非Provider路径不变。
- [x] 4.2 在 Provider controller读取 handoff context，用单次 typed trust snapshot验证 policy readiness、audience、issuer、required scopes，再加载/校验真实Admin user；三个入口按provider error code返回401/403，不改变普通JWT与session路径。
- [x] 4.3 运行router/filter/controller错误HTTP契约与redeem material current-user/scope controller契约至GREEN，并增加organization-tree精确路由识别及普通JWT/非Provider兼容回归。

## 5. 验证、RC与60 smoke

- [x] 5.1 运行 object/routers/controllers聚焦与完整Go测试，生成changed production statements coverage并达到至少85%，不补低价值mock测试。
- [x] 5.2 运行 full hermetic Go suite、`go build main.go`、`go vet ./...`、仓库固定 lint/format门禁、OpenSpec target/changes/specs strict和`git diff --check`；测试前后确认无任务外残留。
- [x] 5.3 更新中文 `verification.md`，完成 pre-archive review但不archive；fetch/rebase最新base，收敛为一个逻辑commit并推送RC工作分支。
- [x] 5.4 主控按获准的60流程部署Admin，重新生成包并配合Insight新草稿完成 redeem/confirm/current-user/scope probe；仅报告状态码、reason alias、计数与短号，不输出任何token/Cookie/raw包/credential/完整secretRef/私有URL/raw row。

## 6. 60 发现问题的契约补充与 RED

- [x] 6.1 对照主规格和60脱敏证据，固定 current-user 在本地映射 `MISSING`、saved resolver unavailable且只能确认 `MISSING` 时返回HTTP 200诊断 envelope；固定 `INVALID`/`AMBIGUOUS`、typed trust disabled/store unavailable/invalid继续fail closed。
- [x] 6.2 为grant create/access-package增加目标组织RED：缺失、`built-in`、不存在或lookup error拒绝；有效组织写入脱敏envelope、package binding、credential claims/auth context；package record/claim不一致拒绝。
- [x] 6.3 扩展完整 router/filter→Provider RED：内置全局管理员签发但绑定业务组织时，current-user/scope/organization-tree统一使用credential target；query不能覆盖；聚合scope/tree只包含目标组织内confirmed mapping成员。
- [x] 6.4 为Admin接入包页面增加组织selector RED，覆盖loading、empty、error、只有`built-in`、未选择、提交中与成功payload；同步zh/en文案且无自由输入。

## 7. 可信目标组织与 Provider 语义 GREEN

- [x] 7.1 在既有grant envelope/create request中加入target organization alias；controller重新校验已选择的非`built-in` Admin组织并把target纳入package hash，保持创建者subject为审计actor且不修改已发布schema manifest。
- [x] 7.2 把target organization与package hash写入v2 runtime credential claims和auth context，validator核对persisted package binding并对旧grant、篡改、撤销、过期fail closed；operator/status/readback不泄露raw material或完整敏感引用。
- [x] 7.3 current-user按可信target organization返回组织/API组织/版本上下文，并把个人`MISSING`保留为成功诊断；scope/tree只从credential context取目标组织，普通JWT/session语义不变。
- [x] 7.4 实现接入包最小组织选择，复用现有组织列表API和AntD工作型状态模式；不修改package/lockfile/构建配置。

## 8. 续作验证与 RC 更新

- [x] 8.1 运行object/controllers/routers聚焦及较广Go测试、changed production statements coverage≥85%、full hermetic suite、`go build main.go`、必要vet/lint/format、OpenSpec target/changes/specs strict和`git diff --check`。
- [x] 8.2 运行前端incremental TS gate、typecheck、聚焦Jest和build；记录未执行或环境限制，不能改写为通过。
- [x] 8.3 更新中文`verification.md`并完成pre-archive review但不archive；fetch/rebase最新base后复验，保持一个逻辑commit并普通push工作分支。
- [x] 8.4 向主控回传新HEAD与脱敏60部署/新包/新草稿验证步骤；主控最终smoke前保持`lease_release=false`、不合base/test。
