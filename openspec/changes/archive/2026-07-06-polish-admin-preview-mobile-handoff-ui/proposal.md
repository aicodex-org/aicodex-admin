## Why

60 预览显示 Admin `Insight Admin Provider 交接` 页面方向已经对齐 P0，但还存在两个影响产品化观感的问题：

- 390px 下如果浏览器没有移动端 UA，Admin shell 仍可能保留桌面侧栏宽度，导致交接页内容被挤窄。
- 默认交接层把缺凭据引用、下一步和诊断阻断重复铺开，页面噪声偏高。

本 change 只做 Admin 侧 UI 预览 polish，不改变后端 contract，不实现 Admin secure handoff，也不把 Admin 做成凭据或 provider 配置中心。

## What Changes

- 将窄视口宽度视为 compact shell 信号，让移动预览复用现有抽屉导航，避免桌面侧栏占用横向空间。
- 保持桌面侧栏行为不变，包括已持久化的折叠偏好。
- 精简默认层重复文案：页面标题说明对象，状态区只表达交接状态，黄色提示只表达缺凭据引用和 Insight 绑定方向。
- 展开诊断时优先展示阻断项紧凑表格，可用能力用 Tag 行展示，技术证据默认进入二级折叠。
- 诊断展开状态通过 URL query 保持可分享；长技术 token 使用不可翻译的 code 样式并在窄容器中约束换行/截断。
- 保留主 CTA `生成元数据交接包` 和 copy-safe 元数据交接边界，不输出真实凭据。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-console-shell`：compact shell 行为同时参考视口宽度，不只依赖 UA/mobile 检测。
- `admin-enterprise-identity-usage-access-entry`：`Insight Admin Provider` 默认交接层降噪，诊断详情保留可排障信息。

## Impact

- 影响文件集中在 `web-admin/src/ManagementPage.tsx`、`web-admin/src/ManagementPage.shell.test.tsx`、`web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、`web-admin/src/ApplicationUsageAccessPage.test.tsx` 和 `web-admin/src/App.less`。
- 不改 API/Gateway/Insight contract。
- 不新增 Admin secret 管理、secure handoff、token broker 或后端凭据生命周期。
