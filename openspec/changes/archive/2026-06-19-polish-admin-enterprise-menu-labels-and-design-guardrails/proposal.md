## Why

Admin 企业认证中心的一级菜单仍存在“组织与账号”“身份源”“权限与角色”等不统一标签，后续 worker 也容易继续新增过长说明、抽象中心或工作台式主入口。需要把四字中文业务名优先的 IA 规则落到代码、测试和仓库工作指引中，避免企业级控制台继续依赖显眼入口表达能力。

## What Changes

- 统一企业认证中心一级菜单中文标签，常规中文分组优先使用四字业务名；保留 `LLM AI/Gateway` 这类专有技术词中英混合识别。
- 在导航自动化测试中增加规则门禁：常规中文一级菜单必须为 4 个中文字符，专有技术词使用 allowlist，不允许新增明显抽象“中心/工作台/任务中心/快捷入口”作为一级分组。
- 在根 `AGENTS.md` 和 `web-admin/AGENTS.md` 固化 Admin 前端一级菜单命名规则，提醒后续 worker 将能力沉到对象详情、抽屉、工具栏、向导步骤或上下文入口。
- 更新 `zh` locale 并核对 `en` locale 语义，保持配置树与运行时侧栏信息架构一致。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 增加企业认证中心一级菜单命名规则、抽象主入口限制和自动化测试门禁要求。

## Impact

- 影响前端文件：`web-admin/src/ManagementPage.navigation.test.js`、`web-admin/src/common/NavItemTree.test.js`、`web-admin/src/enterpriseNavigationLabelRules.testUtils.ts`、`web-admin/src/locales/zh/data.json`。`web-admin/src/locales/en/data.json` 仅做语义核对，当前无需改动。
- 影响仓库规则：根 `AGENTS.md`、`web-admin/AGENTS.md`。
- 不包含后端 API、数据库、OAuth/OIDC 回调、Provider 登录、Gateway publish/projection/cleanup/receipt、package、lockfile、构建基础设施、密钥或 `test` 分支变更。
