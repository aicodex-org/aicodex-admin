## Context

`OrganizationEditPage.tsx` 已是 TSX，但仍是 legacy class component，核心 JSX 集中在 `renderOrganization()`。本次改造优先保持类组件、状态结构、backend 调用和字段 handler 不变，只改变页面组织方式和局部样式。

参考来源：

- 本仓库 `DESIGN.md`：后台界面应保持紧凑、可扫描、工作型，不做营销式说明文案。
- 公司 UI 规范：12/14px 字体层级、12/16px 内边距、16/24px 分区间距、4px 圆角、必填红星、浅底表头和错误提示规则可借鉴，配色继续使用 Admin/AntD token。
- 7000 策略编辑页截图：路径与返回在 Tabs 上方、下划线 Tabs、白底正文、左侧短竖线分区标题、表格区右侧工具条、底部 48px 左右的固定操作栏。

## Goals

- 让组织编辑页形成可扫描的 Tabs 信息架构，并保留 URL hash 恢复当前 tab。
- 让返回、保存、保存并返回、取消在长页面滚动时始终可达。
- 让基础必填字段在前端保存前被校验，失败时自动定位到基础 tab。
- 让子表格、Tree 和交易记录作为全宽内容区呈现，不再被普通 label/content 行压窄。
- 保持现有组织保存 payload、主题刷新、组织变更事件、LDAP、MFA、交易记录和新增取消清理语义。

## Non-Goals

- 不改后端 API、数据库、权限、认证、组织同步或 Gateway projection 行为。
- 不抽全局 `LargeEditPageShell`，组织页先作为样板稳定。
- 不一次性改造应用、用户、Provider、Syncer 等其它编辑页。
- 不实现浏览器关闭或刷新前的全局 dirty 拦截。
- 不把设计稿里的说明性文案带入正式 UI。

## Decisions

### 页面壳

组织编辑页继续保留 `admin-large-edit-page organization-edit-page` 和 `admin-large-edit-card organization-edit-card` 这两个测试/样式边界，但组织页内部改为专属的紧凑编辑 shell：

- 顶部 header：返回、路径、编辑对象标题、未保存状态。
- Tabs：AntD `Tabs`，默认下划线样式，active key 写入 `window.location.hash`。
- 内容区：只渲染当前 tab，分区标题使用左侧短竖线，不再将全部字段堆进 Card title/body 长流。
- 底部 footer：固定在编辑壳底部，按钮居中。

该 shell 的职责边界按后续可抽取组件设计：header 只承载返回路径和对象标题，tabs 只承载 `key/label`，content 只渲染当前 tab，footer 只承载页面级动作和提交态。组织页本次先保留局部实现，避免在应用、用户、Provider 等页面信息架构尚未迁移前提前冻结共享 API。

### Tabs 划分

- `basic`: 名称、显示名称、官网、默认应用、国家/地区、语言、用户类型、标签。
- `brand`: 暗色 logo 开关、Logo、暗色 Logo、Favicon、默认头像、主题设置。
- `security`: 密码类型、密码 Salt、密码复杂度、密码混淆器、过期天数、主密码、默认密码、验证码、IP 白名单、软删除、公开资料、邮箱用户名、Tour、禁用登录、永久头像、built-in 特权同意。
- `navigation`: Admin/User navbar、Widget items、Account menu，对应页面文案“导航菜单”。
- `accountFields`: AccountTable，对应页面文案“账号资料”。
- `mfa`: MFA remember time、MfaTable，对应页面文案“多因素认证”。
- `directory`: LDAP attributes、LdapTable、Kerberos 字段，对应页面文案“目录服务”。
- `transactions`: 仅编辑模式且存在交易数据时展示，保持只读。

### 校验和错误定位

保存前校验 `organization.name` 和 `organization.displayName` 的 trim 后值。任何缺失都会：

- 设置字段错误态和红色错误文案。
- 切换到 `basic` tab。
- 展示现有 `Setting.showMessage("error", ...)` 风格错误提示。
- 阻止调用 `OrganizationBackend.updateOrganization`。

密码混淆器校验失败时切换到 `security` tab，保留现有错误消息。

### Dirty 与返回/取消

本次只对页面内返回和取消做 dirty 确认。任意字段 handler、表格更新、Tree 更新或主题更新会标记 dirty；保存成功后清除 dirty。新增模式的取消仍调用 `deleteOrganization()`，避免留下临时组织。

### i18n

新增 tab、路径、状态和确认文案必须加入 `zh`/`en` locale。已有字段 label 和 tooltip 继续复用现有 key，不新增重复字段文案。

## Risks

- `OrganizationEditPage.tsx` 字段多，移动 JSX 容易漏 handler。实现时优先封装小 helper，并用现有 handler wiring 测试覆盖。
- 类组件内新增 dirty 和 validation state 会增加状态字段。保持状态字段简单，避免引入外部表单库或全局离开拦截。
- 交易记录 tab 是条件 tab，hash 恢复时需要对不可用 tab 回退到 `basic`。
- 桌面固定 footer 需要给内容区预留底部空间，避免遮挡最后一行字段。

## Validation

- `openspec validate polish-organization-edit-tabs-shell --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- `cd web-admin; yarn test src/OrganizationEditPage.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`
- `cd web-admin; yarn test src/OrganizationEditPage.test.tsx src/table/AccountTable.test.tsx src/table/LdapTable.test.tsx src/table/MfaTable.test.tsx src/common/resizeObserverLoopErrorGuard.test.ts src/common/resizeObserverLoopErrorPreflight.test.ts --watchAll=false --runInBand`
- 本地前端代理 60 测试后台浏览器 smoke：组织编辑页渲染、tab 切换、必填校验、保存、保存并返回、返回/取消 dirty 确认、桌面无横向溢出。
