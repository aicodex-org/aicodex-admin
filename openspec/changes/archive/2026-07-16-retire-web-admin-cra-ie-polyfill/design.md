## Context

最新 `web-admin` 使用 React 18.2、Vite 8.1.4与 `build.target="es2020"`。production browserslist为 `>0.2% / not dead / not op_mini all`，本机解析结果不包含Internet Explorer；Vite React plugin v6也不读取仓库 Babel target作为默认production转译入口。Jest transformer显式设置 `babelrc:false`、`configFile:false`，只使用固定 `babel-preset-react-app`，因此production与test Babel边界已经解耦。

当前CRA残留有两个直接owner：`src/index.tsx`加载 `react-app-polyfill/ie9`和`react-app-polyfill/stable`，`jest.config.cjs`加载 `react-app-polyfill/jsdom`。package中的 `react-app-polyfill@3.0.0`再引入 `core-js`、`object-assign`、`promise`、`raf`、`regenerator-runtime`与`whatwg-fetch`。其中 `core-js`仍由production入口直接加载，`object-assign`与`regenerator-runtime`有其它依赖owner；其余是否从lock消失由Yarn实际解析结果裁决。

production入口还保留 `core-js/es` 和一个 `String.prototype.replaceAll` fallback。前者是显式现代兼容owner，后者覆盖当前浏览器查询中早于原生 `replaceAll`的浏览器；两者都不是CRA/IE入口，本 change不删除。`babel.config.json`不被显式Jest transformer读取，也不是Vite React v6的默认production transform配置；移除它需要独立owner审计，不作为本次CRA残留退役的附带清理。

基线Vite build转换5445 modules，输出139个production JS文件，总计8,779,860 bytes、同口径gzip 2,583,497 bytes；入口chunk为556,593 bytes、gzip 161,134 bytes。最终必须用相同Node/Yarn/Vite、相同压缩算法和相同构建命令比较，不以chunk hash或单个偶然拆包代替总量。

## Goals / Non-Goals

**Goals:**

- 让React 18 + Vite浏览器支持真值与生产入口一致，明确Internet Explorer不受支持。
- 删除production和Jest对 `react-app-polyfill` 的全部引用、直接依赖及无owner lock条目。
- 保持 `core-js`、自定义 `replaceAll` fallback、显式Jest/Babel/jsdom、认证路由与public auth scripts行为。
- 通过TDD、完整前端门禁、bundle/lock差异和真实Chromium smoke形成可回归证据。

**Non-Goals:**

- 不改变Vite `es2020`、production browserslist、Babel target或其它现代浏览器支持范围。
- 不删除 `core-js`，不重写全部polyfill策略，不升级React、Router、Jest、AntD、Vite、Playwright或Bun。
- 不修改认证API/payload、Provider/Syncer/TLS、Go/schema/fixture、CI workflow、60配置或 `test` 分支。
- 不借机删除 `babel.config.json`、service worker或自定义 `replaceAll` fallback。

## Decisions

### 1. 现有Vite与browserslist共同定义支持边界，不新增IE兼容声明

Vite `build.target="es2020"`是production JS输出的实际下限，package production browserslist是生态工具可读的声明边界；两者都排除IE。实施只增加契约测试固定这一事实，不改目标值。这样避免把“删除polyfill”误写成一次浏览器范围迁移，也避免为了IE保留React 18/Vite无法完整兑现的假兼容。

替代方案是把browser target升级或收窄到“最近两个Chrome”，但会改变真实产品支持范围并需要独立决策，因此拒绝。

### 2. 只删除CRA owner，保留独立兼容owner

从 `index.tsx`删除两个 `react-app-polyfill` import，从Jest config删除 `setupFiles`中的jsdom入口，并从package/lock删除直接依赖。`core-js/es`、`replaceAll` fallback、Jest environment、`setupTests.ts`和Babel transformer保持不变。Yarn lock只通过当前Yarn 1解析更新，不能手工追删共享条目。

Jest的 `react-app-polyfill/jsdom`只在存在window时加载 `whatwg-fetch`。当前高风险fetch suites均显式提供test double；TDD先要求Jest不再有CRA setup，再由聚焦与全量suite证明没有隐藏依赖。若RED/GREEN过程中发现某个真实suite需要fetch，优先在该suite使用明确mock；不得重新引入全局CRA polyfill或无边界全局mock。

### 3. FrontendCiGates作为结构契约的TDD落点

先修改 `FrontendCiGates.test.ts`，让它断言：production入口无CRA/IE imports、仍保留 `core-js/es`和 `replaceAll` fallback；Jest `setupFiles`不再加载CRA；package无 `react-app-polyfill`；Vite target与production browserslist继续排除IE。旧代码必须因这些断言失败，确认RED来自待退役owner而非测试错误。

随后只做最小production/config/package/lock修改使聚焦测试GREEN。没有新增production函数或分支；changed executable statements只包含删除的side-effect imports，因此覆盖率统计为0个新增可执行statement，结构契约、全量Jest与浏览器smoke承担行为回归门禁。

### 4. Bundle收益使用总JS与入口chunk双口径

实施前后都运行 `yarn public-scripts:build && yarn build`，统计production `.js`文件数、总raw bytes、逐文件内存gzip总量，以及HTML引用入口chunk的raw/gzip bytes。直接依赖数、Yarn top-level lock key数、`react-app-polyfill`及传递owner变化同时记录。无论收益大小都如实记录；若总JS和入口均无下降，仍需证明依赖/维护owner减少，否则停止closeout回传主控。

### 5. 浏览器smoke只使用本地一次性边界

使用真实Chromium访问本地Vite/静态production入口，验证 `/login`启动、OIDC authorize登录入口或等价登录路由可达、`/callback`路由不白屏，并检查console/page error。后端请求使用仓库既有一次性本地fixture或最小脱敏拦截，不连接、不写入60。public auth scripts继续运行仓库自有check/build/smoke；证据不记录完整私有URL、Cookie、token或raw callback payload。

## Risks / Trade-offs

- [Jest suite隐式依赖whatwg-fetch] → TDD移除setup后先跑聚焦fetch/auth suites，再跑145-suite全量；真实缺口用suite-local test double修复，不恢复全局CRA入口。
- [误删共享core-js或regenerator-runtime] → package/source/`yarn why`三层owner审计，保留直接 `core-js`，由Yarn自动决定共享lock条目。
- [浏览器声明与实际Vite输出被混为一谈] → verification分别记录browserslist解析与Vite target，不声称支持列表中所有旧浏览器的完整运行态。
- [bundle拆包hash变化造成错误收益] → 使用总JS与入口双口径、相同命令和内存gzip算法，不比较hash文件名。
- [认证callback smoke误触真实链路] → 仅本地脱敏参数与一次性fixture/拦截，不使用真实provider、凭据或60写入。
- [并行TLS change写集冲突] → 禁止修改Provider/Syncer/TLS/Go/schema及其测试；若上游base在closeout前触及本change文件，rebase后重跑全部受影响门禁。

## Migration Plan

1. 固化baseline owner、浏览器target、direct/lock与production build指标，完成实施前review。
2. 在 `FrontendCiGates.test.ts`写RED并确认失败原因，再实施最小import/config/dependency/lock变更使GREEN。
3. 运行聚焦与完整Jest、typecheck/lint/public scripts/Vite/Playwright discovery，并比较bundle与依赖指标。
4. 使用真实Chromium完成本地登录、OIDC/认证callback与console smoke，清理所有build/report/test-results。
5. 更新技术债基线与verification，完成pre-archive review；若无阻断，sync-specs archive并按self-closeout合入最新base。

回滚只需revert本change提交，恢复两个production imports、Jest setup与Yarn依赖真值；没有数据库、API或配置迁移。

## Open Questions

无。当前代码与产品边界足以保守实施；若真实Chromium或全量Jest证明存在未声明的polyfill依赖，则该失败转为实现阻断，不通过扩大全局polyfill掩盖。
