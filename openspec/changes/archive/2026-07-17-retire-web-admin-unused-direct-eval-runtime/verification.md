## 验证范围

- workspace：`aicodex-admin`固定workspace；分支：`hfl-test/retire-web-admin-unused-direct-eval-runtime`。
- 起始base：`origin/hfl-test-base@1b6356e99574e1d131aeb4e7ae40746709cdcfd9`；`origin/test@5420c8c386de7daee84b7df41de65ba1c404bf2a`只读。
- 变更性质：从 `Setting.tsx`删除零调用的 `parseObject`和6行direct `eval`实现；新增2个focused safety测试面和OpenSpec。没有依赖、lock、Vite/Jest/CI配置、API、认证、Provider、其它业务页或共享环境改动。

## 基线与调用证明

- 限定 `web-admin` 的 `.ts/.tsx/.js/.jsx/.mjs/.cjs` 源码并排除 `node_modules/build/dist`后，`parseObject`只命中 `web-admin/src/Setting.tsx`定义，没有调用引用。
- production `src/**/*.ts(x)`中direct `eval`只命中 `Setting.tsx`一处；`new Function`为0。
- 未修改基线的 `yarn build`：成功，5536 modules transformed，输出1条Rolldown `[EVAL]`并定位 `Setting.tsx`；同时保留1类 `face-api.js`引入 `fs`的browser external提示与1类chunk-size提示。

## TDD RED / GREEN

- RED 1：新增 `RuntimeCodeExecutionSafety.test.ts`后运行focused Jest，合成AST识别测试通过，production契约按预期失败并只报告 `Setting.tsx:979` 的1个direct eval；1 suite中1 pass / 1 fail。
- RED 2：pre-archive自审加入无 `new` 的 `Function("...")`合成fixture后，识别测试按预期失败并证明guard只覆盖了 `new Function`；随后扩展同一AST边界识别两种Function constructor调用。
- 相邻行为基线：在删除生产代码前，`Setting.test.tsx`新增的 `parseJson`空串、合法JSON、非法JSON测试与原有测试共9/9通过。
- GREEN：删除 `parseObject`后运行两个focused suites，2/2 suites、11/11 tests通过。
- 删除后限定源码扫描：`parseObject=0`、production direct `eval=0`、`new Function=0`。未新增JSON5、shim、动态执行或console/build suppression。

## Coverage

- Production changed executable statements：0。`Setting.tsx`的production diff只有 `parseObject` 6行删除，没有新增或修改的可执行语句，因此传统changed-line coverage没有分母。
- 相邻保留行为通过 `jest --coverage --coverageReporters=json --coverageReporters=text --collectCoverageFrom=src/Setting.tsx --runTestsByPath src/RuntimeCodeExecutionSafety.test.ts src/Setting.test.tsx`验证；2 suites / 11 tests通过。
- `coverage-final.json`显示 `parseJson` function count为3，if分支计数为 `[1,2]`，函数内3个statement计数分别为3、1、2，对当前契约覆盖为100%。
- `Setting.tsx`大型历史文件全文件statement coverage为13.37%，不属于本change改动口径，也未被用来制造85%门槛结论。

## 前端静态、测试与构建门禁

- `yarn install --frozen-lockfile`：通过，Already up-to-date；`package.json`与`yarn.lock` SHA-256前后分别保持 `E21C24F093F1DD555AE9B5C03BAD6D17B49A2773DF0137C1C3CADD69AD6AD5F5`、`E1C335C5AD66C8F3B1B126C72ABCDFD316B7F93ECEA62E020ACE285BC2C213ED`。
- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`、`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`：通过；只输出既有Browserslist数据提示。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：通过，smoke输出 `public auth scripts smoke passed`。
- 完整 `yarn test:ci`：155/155 suites、1472/1472 tests、0 failure、0 timeout；在补齐无 `new` 的 `Function(...)` AST识别后，以final test source再次完整运行并取得相同结果。
- 删除后 `yarn build`：成功，5536 modules transformed，direct-eval `[EVAL]` warning为0；保留既有 `fs` browser external与chunk-size warning，不在本change中静默或修改。

## Playwright 与本地build smoke

- `yarn test:e2e:list`：19 files / 22 tests，discovery契约不变；未执行需要数据库的完整E2E。
- 本地Vite preview的 `index.html`返回HTTP 200、`text/html`；真实Chromium加载production bundle并进入 `/login`，页面标题为“AICodex Admin · 认证中心”。
- 无后端fixture时，preview按预期对 `/api/get-account`/`get-application`产生502，证明静态入口不等于后端验收；该证据未写成通过。
- 使用仅限本地browser session的通用未登录API fixture重载后，页面呈现“登录失败”可恢复态，静态请求与两条API请求均成功返回，console为0 errors / 0 warnings，没有page error。
- UI Review状态：`READY`。本change不修改DOM、样式、路由或用户交互；浏览器证据只证明production bundle启动边界。Axe：N/A，不存在UI或可访问性变更。
- 未访问60、未修改或重启任何服务；Playwright sessions、preview进程、build/coverage/report与CLI产物已清理。

## OpenSpec 与卫生

- `openspec validate retire-web-admin-unused-direct-eval-runtime --strict`、`openspec validate --changes --strict`：实施前通过；归档前/后结果在对应review与closeout阶段补录。
- 文档以简体中文说明为主；命令、路径、TypeScript、AST、Vite/Rolldown、CSP与规范关键字保留英文。
- 验证记录不包含真实环境URL、IP、账号、token、Cookie、DSN或原始响应；本地loopback只用于一次性静态preview。

## 归档后 final gate

- 已按 `sync-specs` 归档至 `openspec/changes/archive/2026-07-17-retire-web-admin-unused-direct-eval-runtime`，active changes为空。
- 已创建 `openspec/specs/web-admin-runtime-code-execution-safety/spec.md`；自动生成的 `Purpose TBD`已替换为中文稳定能力说明，主规格与archive副本语义一致且EOF干净。
- `openspec validate --changes --strict`：无active item；`openspec validate --specs --strict`：56/56通过；`git diff --check`：通过。
- archive后focused final gate：2/2 suites、11/11 tests通过；production源码未变化，因此复用同一最终源码状态的final-state全量Jest、typecheck、build、coverage与browser证据。
- closeout `git fetch origin --prune`后 `origin/hfl-test-base`仍为起始base，分支保持latest base + 1 logical commit，无需rebase；`origin/test`未变化。

## 剩余风险

- capability只约束仓库自有production TypeScript/TSX中的direct `eval`与 `new Function`；不声称第三方依赖或全局CSP已经完成治理。
- AST契约保守禁止任何callee identifier为 `eval` 的调用，即使未来局部shadow；这是安全默认，若确有合法需求必须通过新的产品/安全决策修改规格。
- 由于没有production UI或后端行为变化，未运行共享环境或真实登录E2E；本地build smoke不能替代部署环境验收。
