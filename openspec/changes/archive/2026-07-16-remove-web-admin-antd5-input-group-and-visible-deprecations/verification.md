# 验证记录

## 验证范围

本 change 只验证 Admin 前端 AntD 5.24.1 的 `Input.Group` 与目标 modal `visible` 迁移。浏览器验证使用本地前端和脱敏 route fixture，不连接真实认证、Provider、账号或后台数据，因此结论限定为源码、构建和本地前端交互层级。

## TDD 证据

- RED：旧 `CaptchaPage` 向 `CaptchaModal` 传递 `visible`，新增断言读取 `modal.props.open` 得到 `undefined`。
- RED：旧 `SignupPage` 不包含 `.ant-space-compact`，直接渲染同时输出 `[antd: Input.Group]` deprecated warning。
- GREEN：4 组输入组合测试覆盖 Compact 容器、占宽、控件顺序、输入回调与表单规则；captcha/face 测试覆盖 `open` prop、关闭/重开、异步 loading/token 和媒体 cleanup。

## 聚焦测试与覆盖率

- 聚焦 Jest：Login、Signup、UserEdit、SMS、Captcha 与 Face 相关 8 个 suite 共 73 个 test，全部通过。
- changed production coverage：将目标生产文件的 `lcov.info` 与本 change 可执行变更行交叉核对，22 行中 19 行被执行，`19 / 22 = 86.36%`，达到 85% 门槛。统计没有排除目标变更行；测试断言验证用户可观察的组合布局、overlay prop 和生命周期行为。

## 静态、构建与完整测试

- `yarn test:ci`：150 suites / 1384 tests / 0 failure；只保留既有 FakeTimers/native timer 提示，未出现目标 `Input.Group` 或 modal `visible` deprecated warning。
- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`、`yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`、`yarn build`：通过。Vite 只输出既有 browser external、direct eval 与 chunk-size warning。
- `yarn test:e2e:list`：发现 19 个文件、22 个测试。

## Deprecated API 审计

- 目标生产源码 `Input.Group`：0。
- 3 个 wrapper 与 7 个目标调用点的 modal `visible`：0；普通业务数据 `visible` 未改名。
- 生产源码 `destroyOnClose`：11；`destroyOnHidden`：0。
- 未新增 `any`、类型断言、ignore directive、console suppression、skip、sleep、timeout 放宽或弱化断言。

## 本地浏览器 smoke

- 登录：`Space.Compact` 容器/子控件实测为 320 / 112 / 208 px，比例 35% / 65%；区号位于手机号前，Tab 可从区号进入手机号；桌面页面横向溢出为 0。
- 注册：桌面 35% / 65% 与控件顺序保持；390px 下 Compact 本身未溢出。页面仍有既有 35px 横向溢出，来源是旧 `.login-panel` / `.login-form` 的 460px / 400px 固定宽度，不属于本 change，也未通过全局 auth CSS 扩大写集处理。
- UserEdit：实测 Compact 为 280 / 84 / 196 px，比例 30% / 70%；Tab 焦点从区号进入手机号。390px 下组合右边界仍在视口内，页面横向溢出为 0。
- Face ID：UserEdit 与登录入口均能打开 modal；UserEdit 完成关闭、重开、再次关闭，关闭后 dialog 计数为 0，页面横向溢出为 0。
- Captcha：桌面 modal 宽 350px；输入 5 位验证码后确认按钮启用。390px 下 modal 左右边界为 20 / 370 px，页面横向溢出为 0。
- 最终使用全新 production preview 浏览器会话复验登录、Face ID 与 Captcha；脱敏 fixture 请求均返回 200，console 统计为 0 error / 0 warning，未观察到 page error。
- dev 模式 Captcha 首次挂载会输出仓库既有 `[antd: Spin] tip` 告警；production preview 不输出该告警。它不是本 change 新增告警，也未用 console ignore 隐藏。
- 未运行 axe：本 change 不新增依赖，且组件语义沿用 AntD；键盘焦点、dialog role、按钮禁用态和窄屏边界已人工验证。

## 版本边界与剩余风险

- AntD 固定为 5.24.1；该版本 `ModalProps` 只有 `destroyOnClose`，没有 `destroyOnHidden`。11 处 `destroyOnClose` 保持不变，待后续 AntD minor 升级后重新验证表单、媒体和异步清理再迁移。
- 本地 fixture smoke 不能证明真实 OAuth、Face ID 摄像头、Captcha Provider 或后端认证链路；本 change 未改变这些协议与 API 契约。
- 注册页 390px 的既有页面级固定宽度溢出需由独立 auth 响应式任务处理，本 change 已证明 Compact 不是溢出来源。
