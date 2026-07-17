# Pre-Archive Review

## 结论

状态：`READY`

本次审查范围内未发现阻断问题。实现、测试、OpenSpec与验证记录描述同一最小结果：删除零调用的 `Setting.parseObject`，使自有production TypeScript/TSX不再包含运行时字符串执行，并通过AST与真实production build建立防回退。

## 发现项与已应用修复

- P2 / Testing：初版AST guard只识别 `new Function(...)`，未识别语义等价的 `Function(...)`。先加入合成fixture取得预期RED，再让同一walker覆盖call/new expression；focused 2 suites / 11 tests、final-state完整Jest与typecheck均GREEN。
- P3 / Hygiene：浏览器CLI、coverage、build与Playwright report均为ignored临时产物；已在审查前精确清理，preview与浏览器session进程为0。
- 没有其它Blocking、Question或需要扩大写集的问题。

## 验证

- `openspec validate retire-web-admin-unused-direct-eval-runtime --strict`：通过。
- `openspec validate --changes --strict`：通过，1/1 active change。
- `openspec validate --specs --strict`：通过，55/55主规格。
- `git diff --check`：通过。
- focused final：2/2 suites、11/11 tests通过。
- final-state `yarn test:ci`：155/155 suites、1472/1472 tests、0 failure、0 timeout。
- final-state `yarn typecheck`：通过；此前同一production源码上的build-tooling/E2E typecheck、incremental TS、lint、public scripts也通过。
- `yarn build`：成功，direct-eval `[EVAL]`为0；只保留既有 `fs` external与chunk-size提示。
- `yarn test:e2e:list`：19 files / 22 tests；本地production build Chromium smoke在未登录fixture下0 console error / 0 warning。

## 单测覆盖率

- Production changed executable statements：0，production diff只有 `parseObject`删除，没有新增/修改可执行行，changed-line coverage无分母。
- 相邻保留的 `parseJson` function count为3，if分支 `[1,2]`，函数内statement均执行，当前契约覆盖100%。
- `Setting.tsx`全文件历史coverage 13.37%不属于本change改动口径，未用全仓或全文件平均值掩盖风险。

## 注释 Review

- production只删除未使用导出，没有新增public API、复杂逻辑、业务字段或非显然分支，不需要新增生产注释。
- 新test-only walker的类型、函数名与局部变量直接表达递归枚举、AST识别和相对路径诊断职责；无需要维护者反推的业务规则。文件已补仓库一致的license header，未添加复述代码的低价值注释。

## OpenSpec 文档语言

- 已检查proposal、design、tasks、verification、pre-implementation review、delta spec；正文以简体中文说明为主。
- 保留的OpenSpec固定标题、SHALL/WHEN/THEN、TypeScript、AST、direct `eval`、Vite/Rolldown、CSP、JSON等属于规范关键字或标准技术术语。
- 没有 `Purpose TBD`、模板占位、歧义性英文正文或未收口Open Questions。

## 验证文档语言与脱敏

- `verification.md`以简体中文记录命令、结果、证据层级与剩余风险；没有把源码/build/browser证据夸大为共享环境验收。
- 文档未包含真实环境URL、IP、账号、token、Cookie、DSN、凭据或原始响应；本地loopback只作为一次性preview证据。

## 运行态验收口径

- 本change不修改DOM、路由、API或服务端；浏览器smoke只证明production bundle可启动、静态入口HTTP成功、fixture下console清洁。
- 未运行共享环境或破坏性E2E，且没有把本地fixture证据写成登录、API或部署验收。
- UI Review：`READY`；Axe N/A，因为没有UI或可访问性变更。

## 主规格同步

- `web-admin-runtime-code-execution-safety`是新capability，当前主规格不存在；`archive --yes`将按 `sync-specs`创建独立主规格。archive后必须复查Purpose、中文语义、EOF并重跑changes/specs strict。

## 交付单元收敛

- 当前基线为 `origin/hfl-test-base@1b6356e99574e1d131aeb4e7ae40746709cdcfd9`，工作分支只包含当前change的未提交写集。
- pre-archive后将创建单个进度commit；archive与主规格同步通过amend收敛为latest base + 1 logical commit。
- closeout任务4.3-4.5尚未执行，保持open符合当前阶段；普通非强制push base前必须重新fetch/rebase并重跑final gate。

## 剩余风险

- capability只覆盖项目自有production TypeScript/TSX，不代表第三方依赖或全局CSP治理完成。
- 本地browser fixture不覆盖真实后端、权限或登录链路；本change没有这些运行态行为修改。

## 下一步

- 允许按 `sync-specs` archive并进入self-closeout；archive后只要主规格、单提交与final gate均通过即可普通非强制push `hfl-test-base`，绝不push/merge `test`。
