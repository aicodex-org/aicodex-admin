## ADDED Requirements

### Requirement: Admin 前端必须锁定维护中的 AntD 5 版本

`web-admin` SHALL 精确锁定官方 npm `latest-5` 对应的 AntD 5.29.3，并 SHALL 使用唯一 Yarn lock 完成 frozen lifecycle install。实现 MUST NOT 升级到 AntD 6、放宽为浮动版本或顺手升级 React、Router、Jest、Vite、Playwright、Bun及其它无关直接依赖。

#### Scenario: 依赖与实际安装版本一致

- **WHEN** 开发者从空的目标依赖树执行 `yarn install --frozen-lockfile`
- **THEN** `package.json`、`yarn.lock`、`yarn why antd` 与实际 `antd/package.json` SHALL 都解析为 5.29.3
- **AND** React/ReactDOM peer SHALL 继续由仓库当前 React 18 满足

#### Scenario: 版本边界不扩大

- **WHEN** 生成升级后的 lock diff
- **THEN** 直接依赖变化 SHALL 只包含 `antd` 5.24.1→5.29.3
- **AND** 间接变化 SHALL 可追溯到 AntD/rc-* 解析，不得引入 AntD 6或双 AntD主版本

### Requirement: 11 个目标 overlay 必须使用 destroyOnHidden

IdentityAsset、Record、Session、Webhook 四个 Drawer，Captcha/Face 四个 Modal位置和 WeCom三个 Modal MUST 使用类型安全的 `destroyOnHidden`，并 MUST NOT 在生产源码继续使用 `destroyOnClose`。实现 SHALL NOT 使用 `any`、type assertion、ignore directive或未知 JSX prop伪造兼容。

#### Scenario: 生产 prop 基线完成迁移

- **WHEN** 对 `web-admin/src` 生产 TS/TSX执行精确扫描与 TypeScript校验
- **THEN** `destroyOnClose` 计数 SHALL 为 0
- **AND** `destroyOnHidden` 计数 SHALL 为 11，且每一处都属于 proposal 列出的 owner

#### Scenario: 关闭动画结束后销毁子树

- **WHEN** 用户关闭任一目标 Modal或 Drawer
- **THEN** overlay SHALL 完成关闭动画后卸载其 child tree
- **AND** owner组件、父级业务状态与其它 overlay SHALL 不被意外卸载或重置

### Requirement: Captcha 与 Face overlay 必须保持资源和 fresh-session 契约

Captcha、Face camera和Face upload路径 SHALL 保持既有确认、取消、loading、token、media track、interval与模型加载语义。关闭后 SHALL 清理属于当前会话的资源，重开 SHALL NOT 复用已结束的 media stream或已清理 token。

#### Scenario: Captcha 关闭并重开

- **WHEN** Captcha modal完成一次加载后被关闭并再次打开
- **THEN** 旧 captcha/widget child tree和 token SHALL 已清理
- **AND** 重开 SHALL 触发新的 captcha加载并继续使用现有 callback契约

#### Scenario: Face camera关闭并重开

- **WHEN** Face camera modal获得 mock media stream后关闭并再次打开
- **THEN** 旧 stream的每个 track和检测 interval SHALL 被停止
- **AND** 重开 SHALL 请求新的 media session且不复用旧捕获状态

#### Scenario: Face upload保持确认语义

- **WHEN** Face upload modal关闭并重开
- **THEN** overlay child tree SHALL 在隐藏后重建
- **AND** 模型加载、文件选择、确认和取消 callback语义 SHALL 与升级前一致

### Requirement: 普通 Drawer 与 WeCom modal 必须保持业务状态边界

普通详情 Drawer SHALL 在隐藏后卸载详情 DOM并在重开时使用当前 selection；WeCom preview、history和history detail SHALL 保持各自打开时的清旧错误/重新加载策略。`destroyOnHidden` SHALL NOT 被解释为自动清空父页面缓存。

#### Scenario: 普通 Drawer关闭并选择新记录

- **WHEN** 用户关闭 IdentityAsset、Record、Session或Webhook Drawer后选择另一条记录重开
- **THEN** 旧详情 DOM SHALL 已卸载且新 Drawer只显示当前记录
- **AND** Session的 record/index/Popconfirm状态 SHALL 按现有 close handler清理

#### Scenario: WeCom preview与detail重开

- **WHEN** 用户关闭 preview或history detail后再次触发打开
- **THEN** 页面 SHALL 清旧 data/error并发起当前请求
- **AND** 已关闭 modal的旧 child tree SHALL 不再可见或处理交互

#### Scenario: WeCom history重开

- **WHEN** 用户关闭 history modal后再次打开
- **THEN** 页面 SHALL 重新刷新 history并重建 table child tree
- **AND** 验证 SHALL NOT 要求`destroyOnHidden`清空父级缓存，也不得误报父级缓存已由overlay销毁

### Requirement: 升级必须通过完整前端与浏览器门禁

升级 SHALL 以 changed production coverage、全量前端门禁、真实 Chromium production preview和同口径 bundle/warning对比作为交付门槛。验证 MUST NOT 通过 console suppression、skip、任意 sleep、放宽断言或真实企业凭据制造通过。

#### Scenario: 自动化质量门禁

- **WHEN** change准备归档
- **THEN** changed executable statements/lines SHALL 达到 85%
- **AND** frozen install、全量 Jest、app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts check/build/smoke与 Vite build SHALL 全部通过
- **AND** Playwright discovery SHALL 保持 19 files / 22 tests

#### Scenario: Chromium生命周期与布局验证

- **WHEN** 使用脱敏 fixture/mock media在 production preview验证 Captcha/Face、一个普通 Drawer和一个 WeCom modal
- **THEN** close-reopen、资源/异步清理、焦点回归和1440/390布局 SHALL 符合各 owner契约
- **AND** 非预期 console、pageerror和requestfailed SHALL 为0，且不得连接60、真实摄像头或企业凭据

#### Scenario: Bundle和warning不发生无解释回退

- **WHEN** 以升级前后相同 Node/Yarn/Vite命令比较 production build
- **THEN** 验证 SHALL 记录总 asset字节、关键大 chunk和 warning类别
- **AND** 新增 AntD runtime/deprecation warning或无解释的大幅 bundle回退 SHALL 阻止归档
