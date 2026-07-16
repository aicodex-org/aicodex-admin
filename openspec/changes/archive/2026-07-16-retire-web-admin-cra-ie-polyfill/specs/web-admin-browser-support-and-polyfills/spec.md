## ADDED Requirements

### Requirement: production浏览器支持边界必须与React 18和Vite一致
`web-admin` SHALL 以当前production browserslist声明和Vite production target作为浏览器支持真值，MUST NOT 声称或注入Internet Explorer兼容层。删除legacy polyfill时 SHALL NOT 未经独立change改变其它现代浏览器目标。

#### Scenario: 构建production应用
- **WHEN** Vite构建 `web-admin` production资源
- **THEN** build target SHALL 保持当前 `es2020`边界
- **AND** production browserslist SHALL 排除dead browsers与Internet Explorer
- **AND** production入口 SHALL NOT 加载 `react-app-polyfill/ie9`、`react-app-polyfill/ie11`或 `react-app-polyfill/stable`

### Requirement: CRA polyfill必须完全退出production与测试owner
`web-admin` SHALL NOT 直接依赖 `react-app-polyfill`，production入口和Jest setup SHALL NOT 引用其模块，Yarn lock SHALL 不保留仅由该直接依赖拥有的package entry。

#### Scenario: 安装frozen Yarn依赖
- **WHEN** 开发者使用tracked package与lock执行 `yarn install --frozen-lockfile`
- **THEN** 安装 SHALL 成功且package/lock SHALL 不包含 `react-app-polyfill`
- **AND** `whatwg-fetch`、`raf`或 `promise`等条目只有在存在其它可证明owner时才可保留

### Requirement: 独立兼容owner必须保持可审计
退役CRA polyfill时 SHALL 保留仍被production或其它依赖直接拥有的兼容实现，包括 `core-js`生产入口和当前 `replaceAll` fallback；共享 `regenerator-runtime`或 `object-assign`条目 SHALL 由Yarn依赖图决定，不得为追求lock清零误删。

#### Scenario: 审计polyfill owner
- **WHEN** change比较移除前后的source、package与lock
- **THEN** `core-js/es` production import SHALL 保持存在
- **AND** 当前 `replaceAll` fallback SHALL 保持存在
- **AND** verification SHALL 区分已删除的CRA专属owner与仍由其它dependency拥有的共享entry

### Requirement: 认证启动与callback必须在真实Chromium保持可达
CRA polyfill退役后，`web-admin` SHALL 在真实Chromium中保持登录启动、OIDC/认证callback路由与public auth scripts可执行，且 SHALL NOT 为smoke使用真实凭据或写入共享测试环境。

#### Scenario: 本地运行登录与callback smoke
- **WHEN** reviewer以脱敏本地参数访问登录、OIDC authorize或等价登录入口以及 `/callback`
- **THEN** 页面 SHALL 启动且目标路由 SHALL 可达，不出现polyfill缺失导致的白屏
- **AND** browser console/page error SHALL 不包含CRA polyfill移除引入的错误
- **AND** public auth scripts check/build/smoke SHALL 通过

### Requirement: polyfill退役必须提供同口径依赖与bundle证据
change SHALL 记录移除前后direct dependency、Yarn top-level lock entries、production JS总raw/gzip与入口chunk raw/gzip的同口径差异，并 SHALL 如实说明未下降或拆包变化。

#### Scenario: 比较production产物
- **WHEN** 最终production build完成
- **THEN** comparison SHALL 使用相同Node/Yarn/Vite、相同build命令和相同gzip算法
- **AND** SHALL 同时报告总JS与HTML入口chunk，不能只用hash文件名或单个chunk宣称收益
- **AND** 若bundle无可观察下降，verification SHALL 明确记录依赖owner与维护收益是否仍成立
