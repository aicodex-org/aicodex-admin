## Context

最新基线精确锁定 `antd 5.24.1`，实际安装类型中的 `ModalProps` 只有 `destroyOnClose`，生产源码扫描为 `destroyOnClose=11`、`destroyOnHidden=0`。官方 5.25.0 changelog、Modal/Drawer API 与合并的 PR #53739 共同确认 `destroyOnHidden` 自 5.25.0 提供；npm registry 在 2026-07-17 标记 `latest-5=5.29.3`、`latest=6.5.1`。

候选比较：

- 5.25.4 是首个支持 minor 的最终 patch，改动最小，但不是当前维护标签。
- 5.29.3 是官方 `latest-5` 稳定线，仍保持 React/ReactDOM peer `>=16.9.0`，Modal/Drawer 类型明确支持 `destroyOnHidden`；相对 5.24.1 有 20 项 rc-* 直接依赖约束变化。
- AntD 6 超出本 change，可能带来更大 peer/API/样式迁移，不参与候选。

升级前 Vite build 已在同一基线通过：5296 modules，`build/assets` 总计 8,968,150 B；既有 warning 为 face-api `fs` browser external、`Setting.tsx` direct eval 和 >500 kB chunk。Playwright discovery 为 19 files / 22 tests。

## Goals / Non-Goals

**Goals:**

- 精确 pin `antd 5.29.3` 并生成可 frozen install 的单一 Yarn lock。
- 把 11 处目标 Modal/Drawer 迁移为真实类型支持的 `destroyOnHidden`，保持关闭动画结束后卸载子树的语义。
- 保护 Captcha/Face 资源清理、四个普通 Drawer 详情状态和 WeCom 三个 modal 的刷新/异步边界。
- 用 TDD、changed production coverage、全量质量门禁、bundle/warning 对比和真实 Chromium smoke 证明兼容。

**Non-Goals:**

- 不升级 AntD 6、React、Router、Jest、Vite、Playwright、Bun或其它无关直接依赖。
- 不修改 SignupPage、认证行为、TLS Provider/Syncer、Go/schema、CI workflow、60配置或 CRA/polyfill 已归档语义。
- 不扫仓处理 5.25→5.29 新出现的其它 deprecated API，不做全局样式/组件重写。
- 不连接真实摄像头、企业凭据、60或共享数据库；本地 fixture/browser smoke 不表述为真实认证或企业集成 E2E。

## Decisions

### 1. 精确选择官方 `latest-5` 5.29.3

选择 5.29.3 而不是 5.25.4，因为目标同时要求功能支持、稳定和仍维护；`latest-5` 是 registry 当前可验证的维护信号。5.29.3 与 5.25.4 的 Modal/Drawer 类型、React peer、`rc-dialog~9.6.0` 和 `rc-drawer~7.3.0` 一致，但 5.29.3 含后续 bugfix/a11y/type 改进。精确版本避免后续 install 随 caret 漂移。

升级使用 Yarn 1 生成锁文件，随后运行 `yarn install --frozen-lockfile`、`yarn why antd`、实际 package/type检查。lock 中只允许 AntD 及其解析所需间接依赖变化；若出现无关直接依赖变化则回滚并重生成。

完整Jest首轮证明旧lock把`rc-notification@5.6.4`的`rc-util@^5.20.1` selector继续映射到5.34.0，而5.6.4运行时已从根导出调用`useEvent`。修复只把该selector合并到已有5.44.4 stanza；frozen重放后`rc-notification/node_modules/rc-util`为5.44.4且`useEvent`为函数，顶层其它旧范围仍保留5.34.0，不通过新增直接依赖或resolution扩大影响。

### 2. RED 同时覆盖类型/计数，生命周期使用高价值 characterization

先新增目标 contract test/type fixture：在 5.24.1 上对 `ModalProps`/`DrawerProps.destroyOnHidden` 产生预期 TypeScript RED，并对 11 个目标文件产生 `destroyOnClose=11` / `destroyOnHidden=0` 的迁移 guard RED。它证明新 API 不能在旧版本通过 `any`、assertion 或 ignore 伪造。

关闭/重开是本次必须保持的既有行为，因此先用真实组件建立characterization：Captcha fresh request、Face `track.stop`与reopen new media、普通Drawer DOM卸载与新记录、WeCom preview/history/detail reopen refresh。它们可以在旧prop下通过，但迁移后必须继续通过；真正的RED由新类型与11-owner guard提供，不以mock prop调用次数替代用户可观察生命周期，也不谎称所有characterization都会先失败。

### 3. 11 处生产改动保持机械且不改变父级状态契约

实现只把目标 JSX prop 从 `destroyOnClose` 替换为 `destroyOnHidden`。`destroyOnHidden` 等待 overlay 隐藏后卸载其 child tree；它不会卸载 owner 组件，也不会自动清空 owner 的 React state。

- Captcha 继续由 `onCancel` / `afterClose` 清 token并重新 load。
- Face 继续由 open effect cleanup 停止 tracks/interval和清捕获状态，不把真实摄像头访问引入测试。
- Session close handler 继续清 record/index/Popconfirm；Identity/Record/Webhook 重开由当前 selection 驱动。
- WeCom preview/detail 打开方法继续清旧 data/error并请求；history 打开继续 refresh。关闭仅切 open，父级缓存保留不被错误描述为已销毁。

若 5.29.3 暴露阻断性类型/运行时问题，只做目标 owner 或直接测试内的最小兼容修复；需要扩大到其它组件/依赖时停止并回传主控。

实际完整门禁只新增三类直接兼容：`rc-table`的隐藏measure/fixed header副本使全局唯一文本查询失效，测试收紧到真实`thead th[scope=col]`；Modal close button与内部span共享label后，Feishu测试改查button role；`SiteEditPage`被新增`InputNumber.addonAfter` warning阻断，单处改用同组件的`suffix`保留“秒”单位。没有扫仓迁移其它历史`addonAfter`。

### 4. 验证按“迁移 guard + 行为 + 完整门禁”分层

- 迁移 guard：生产 `destroyOnClose=0`、`destroyOnHidden=11`，package/lock/actual version 均为 5.29.3，无 `any`、type assertion、ignore 或 console suppression。
- 行为：关键 close→hidden→DOM removed→reopen，media/interval cleanup、WeCom refresh和普通 Drawer current selection。
- 覆盖率：changed executable statements/lines >=85%，只统计本 change 修改的生产 owner/必要兼容代码；机械 prop 行可由真实行为测试覆盖，不用纯字符串测试制造覆盖率。
- 完整门禁：frozen install、全量 Jest、app/build-tooling/E2E typecheck、增量 TS、lint、public scripts check/build/smoke、Vite build、19/22 discovery。
- 浏览器：production preview + 脱敏 fixture/mock media，在 1440/390 验证 Captcha/Face、一个 Drawer 和一个 WeCom modal，console/pageerror/requestfailed=0，并检查关闭后的焦点回归。

### 5. Bundle/warning 采用同口径比较

升级后用同一 Node/Yarn/Vite 命令记录 `build/assets` 总字节和关键大 chunk。允许 hash 变化；若总量或关键 chunk出现明显增长，先从 lock diff与 bundle chunk定位并解释，不能只以“build 通过”放行。warning 与升级前三类基线逐项比较，新增 AntD deprecation/runtime warning 视为阻断。

## Risks / Trade-offs

- [5.29.3 比最小支持版本包含更多 rc-* 升级] → 全量 Jest/typecheck/build/browser覆盖 table/upload/overlay 间接回归；不在同 change 修复无关 deprecation。
- [JSDOM 动画与真实浏览器时序不同] → Jest 证明 DOM/状态契约，Chromium production preview 证明真实 close animation、focus和资源清理。
- [destroy prop 只卸载 overlay children，不清 owner state] → 测试显式区分 child DOM销毁与父级 state刷新，避免错误“重置”断言。
- [bundle hash/压缩结果可能受构建环境影响] → 同 workspace、同 Node/Yarn/Vite、同命令前后比较总字节与关键 chunk，不要求性能收益。
- [5.29.3 新类型可能暴露写集外历史问题] → 只允许目标 minor 强制的直接兼容修复；需要扩大写集时停止并请求主控。
- [Yarn 1旧selector可能形成兼容范围内的陈旧hoist] → frozen install后核对消费方私有实际版本和关键导出，不只检查顶层`rc-util`。

## Migration Plan

1. 固化官方证据、11-owner matrix、5.24.1 build/warning/bundle 与 19/22 discovery 基线。
2. 新增类型/计数 RED 和关键 lifecycle characterization；记录失败/通过边界。
3. 精确升级 5.29.3、生成 lock 并执行 frozen install/why/type/peer检查。
4. 机械迁移 11 处 prop，修复目标 minor 强制的最小兼容问题，运行聚焦测试与覆盖率。
5. 运行完整门禁、production preview Chromium smoke和 bundle/warning 对比，更新验证记录与技术债基线。
6. pre-archive READY 后同步两份主规格、收敛为 latest base + 1 commit并按 self-closeout 推送。

回滚为 revert 单个最终 commit，恢复 `antd 5.24.1`、原 lock 与 11 处旧 prop；没有数据、API、配置或部署迁移。

## Open Questions

无。版本选择、owner写集、生命周期口径、验证、回滚和 AntD 6边界已由官方证据、当前代码和 controller envelope 收口。
