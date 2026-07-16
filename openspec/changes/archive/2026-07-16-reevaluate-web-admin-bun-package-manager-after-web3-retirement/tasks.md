## 1. 启动门禁与输入基线

- [x] 1.1 fetch/prune，确认workspace clean、HEAD对齐最新 `origin/hfl-test-base`、`origin/test`只读且active OpenSpec无冲突，再创建目标工作分支。
- [x] 1.2 读取仓库/web-admin/OpenSpec规则、技术债路线、三轮Bun NO-GO archive、Playwright/Web3/RTL archive及当前package/lock/CI/Docker/Makefile/local-dev约束。
- [x] 1.3 重新清点最新Node/Yarn/Bun、Playwright、Jest、Vite、RTL/DOM版本，以及Web3/Cypress/`bluebird`残留和lock/tree规模，不照抄历史快照。
- [x] 1.4 创建完整中文proposal/design/spec/tasks，固化写集、3样本、fail-fast、20%/10%、Docker硬门禁、脱敏与RC-only边界。
- [x] 1.5 运行target/all changes strict与 `git diff --check`，完成pre-implementation review至READY后再运行安装样本。

## 2. 官方版本与迁移工具边界

- [x] 2.1 核验Bun官方latest stable与本机版本；stable一致时保留本机1.3.14，不升级全局、不安装canary/PR构建。
- [x] 2.2 核验Windows缺文件issue #32458、hardlink PR #33113及相关release状态，明确未发布修复只作归因背景。
- [x] 2.3 核验setup-bun/action、`bun.lock`/`bun ci`和官方Docker模式，记录action不缓存依赖、迁移不得保留双lock真值及官方示例不能替代Admin Docker build。

## 3. Bun主样本准备

- [x] 3.1 固定评估HEAD与tracked-input hash，在仓库外建立3个短路径workspace、每轮独立空lock cache/install cache/log目录，并验证路径均属于本任务临时根。
- [x] 3.2 为3轮生成字节相同的临时package输入：只替换Yarn-only `preinstall` guard、增加有owner的最小 `trustedDependencies`，保留依赖/resolution/scripts与tracked `yarn.lock`不变。
- [x] 3.3 建立关键完整性清单，覆盖React/ReactDOM、Jest、Vite、RTL/DOM、Playwright、`rc-virtual-list`、Vite Windows binding、CLI shim与lifecycle状态。

## 4. 三个隔离frozen lifecycle样本

- [x] 4.1 串行执行样本1的空cache `bun install --lockfile-only`与另一空cache `bun install --frozen-lockfile --backend=hardlink`，记录exit/耗时/ENOENT/lock/tree/关键入口。
- [x] 4.2 串行执行样本2的同边界两阶段安装并记录同一矩阵，不复用样本1 cache、lock输出或 `node_modules`。
- [x] 4.3 串行执行样本3的同边界两阶段安装并记录同一矩阵，不复用前两轮cache、lock输出或 `node_modules`。
- [x] 4.4 比较三轮candidate package、tracked Yarn输入、`bun.lock` hash/entries、direct resolution与tree shape；任一install失败、ENOENT、残缺或不一致即固定 `NO-GO`。

## 5. 条件式性能与质量门禁

- [x] 5.1 仅在Bun 3/3有效时，以原始package+yarn.lock和3个独立空Yarn cache运行cold controls，计算Bun/Yarn中位数与20%收益；否则明确标记条件未满足且不计算。（0/3有效，按设计停止且未计算。）
- [x] 5.2 仅在Bun 3/3有效且收益通过时，通过 `bun run`运行完整Jest 145/1371、app/build-tooling/E2E typecheck、增量TS gate、production lint与public scripts check/build/smoke；保持Jest，不使用 `bun test`。（成功路径条件未满足，未在残缺tree上运行。）
- [x] 5.3 仅在有效tree上运行 `bun run vite build`与Playwright discovery 19/22，记录Jest/Vite相对Yarn无依据回退是否不超过10%；无一次性SQLite时不运行破坏性22/22 E2E。（成功路径条件未满足，未触碰E2E环境。）
- [x] 5.4 仅在成功路径验证Admin Docker真实frozen install/build及CI/setup/cache/lock、Makefile、local-dev迁移方案；本机无Docker或任一活动门禁未闭环时不得判 `GO`。（成功路径条件未满足；只保留迁移边界审计，不声称Docker通过。）

## 6. 决策、验证与卫生

- [x] 6.1 按预先规格输出 `GO`或`NO-GO`；不得把失败/无效tree、静态审计、历史样本或未执行门禁写成通过。（结论：`NO-GO`。）
- [x] 6.2 编写中文脱敏 `verification.md`，包含版本/官方URL、3轮matrix、lock/tree/完整性、条件门禁、性能/质量状态、coverage N/A、剩余风险和证据层级。
- [x] 6.3 删除本任务短路径workspace/cache/node_modules/lock/log/binary/process/report/临时数据库及browser-act临时指南，确认无任务残留且不清理未知用户产物。
- [x] 6.4 运行target/all changes/all specs strict、`git diff --check`、中文/TBD/脱敏/EOF检查，并完成pre-archive review至READY；保持active，不archive。

## 7. Release candidate 收敛

- [x] 7.1 fetch/rebase latest `origin/hfl-test-base`；若触及本change输入或语义，从受影响门禁重验，不覆盖其他worker改动。
- [x] 7.2 精确stage当前change拥有的OpenSpec文件，收敛为latest base + 1 logical evaluation commit并普通push工作分支。
- [x] 7.3 回传envelope、`lifecycle_state=RC_READY`、GO/NO-GO、版本、3轮matrix、性能/质量、官方issue、changed files、remaining risk、temp residue、`push_test=false`、`lease_release=false`与`needs_master_decision=true`。

## 8. API Bun成功基线补证

- [x] 8.1 只读比较API与Admin的Bun版本、原生/导入lock、bunfig/linker/backend/cache、workspace形态、依赖规模、lifecycle/trustedDependencies、本地Makefile、Ubuntu CI与Linux Docker入口；不修改API仓库。
- [x] 8.2 在固定API tree上运行3个独立短路径、空cache、hardlink frozen样本，并补充默认backend/常规cache的frozen与裸 `bun install`对照；区分install exit、direct完整性与Vite build可运行性。
- [x] 8.3 在Admin临时单 `bun.lock` tree上按API本地方式执行裸 `bun install`；验证首次失败、同workspace第二次成功补齐73/73，以及修复tree的typecheck/public scripts/Vite/Jest/Playwright门禁。
- [x] 8.4 纠正Bun Windows CLI为 `.exe`/`.bunx`而非Yarn `.cmd`的检查器错误，并以单变量验证确认原始 `bun run lint`失败由未加引号glob触发、加引号后通过。
- [x] 8.5 更新design/verification，明确本轮一次frozen 3/3硬门槛仍失败，API经验只形成“有界frozen重试 + Bun shell兼容”下一轮最小变量，不将已有tree可运行外推为迁移可采用。
- [x] 8.6 清理本次API/Admin补证临时root、cache、node_modules、lock、log、junction、build产物与进程，重跑strict/diff/clean/residue门禁并force-with-lease更新RC工作分支。
