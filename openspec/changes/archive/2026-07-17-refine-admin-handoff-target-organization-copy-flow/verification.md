# 验证记录

## 范围与安全边界

本 change 只调整 Admin `web-admin` 的目标组织选择与接入包生成操作流。请求仍调用既有 `createInsightAdminAccessPackage(copySafeMetadata, targetOrganization)`；未修改服务端 target 校验、grant/packageHash/runtime credential claims、创建者审计 subject、secure handoff 生命周期、Provider scope、DB、API 或 Insight。

页面与验证证据未记录 raw package、grant、token、Cookie、credential、完整 secretRef、私有 URL、raw response 或 raw row。成功摘要只使用已加载候选中的 copy-safe organization display name 与 alias。

## TDD 与自动化

- RED：实现前运行 `yarn jest src/ApplicationUsageAccessPage.test.tsx --watchAll=false --runInBand`，19 个用例中仅新增 2 个失败；失败点分别为 CTA 仍在 selector 前，以及成功状态缺少授权组织摘要。
- GREEN：实现后同命令 19/19 通过；覆盖无默认、selector/CTA DOM 顺序、未选择禁用、loading/empty/error/submitting、成功回读、组织变化清除结果、runtime warning 非阻断和敏感 material 不展示。
- Coverage：使用同一 focused Jest 加 `--coverage --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --coverageReporters=json`，按 `origin/hfl-test-base` diff 的 changed production statements 统计为 `34/36 = 94.44%`，达到 85% 门槛。整文件历史口径 statements 为 83.55%，未将其误写成 changed coverage。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn stylelint src/styles/identity/application-access-credential.less`：通过。
- `yarn eslint src/ApplicationAccessServiceCredentialGovernancePanel.tsx --max-warnings=0`：通过；仅有 Browserslist 数据提示。
- `yarn build`：在最终 rebase 后 fresh 通过；新基线已移除 direct-eval warning，仅保留既有 browser externalization 与 chunk-size warning。

## 真实认证态 UI Review

使用仓库 `local-dev/start-frontend-remote-backend.ps1` 只启动本地 Vite 前端，代理到已授权的 60 测试后台；通过现有本机 Chrome 登录态访问 `/application-usage-access`。未读取或输出账号密码、Cookie 或完整后台地址。

- 1440 CSS viewport：`document/body overflow = 0`；selector 在 DOM 中先于 CTA；selector 与 CTA 无重叠；主操作区在视口内。
- 390 CSS viewport：通过同源、同登录态 popup 取得精确 `innerWidth=390`；`document overflow = 0`，selector、CTA、操作区均在视口内且无重叠；授权范围说明、未选择提示和 disabled CTA 可见。
- 键盘：Select 获得焦点后可用 Enter/方向键选择；选择后 CTA enabled，Tab 可进入主 CTA。
- 运行请求：观察到 5 个 XHR/fetch，HTTP error 与 network-zero 均为 0；交互期捕获的 console error 为 0，页面无 error overlay。
- 失败/空态：Jest 对 organization loading、empty、error 与 submitting 已覆盖；浏览器未伪造或写入失败 fixture。

浏览器证据截图仅用于本机人工 review，完成后已删除；未把真实组织展示名或其它运行态数据写入仓库。

## Fixture 与清理

浏览器只做目标组织本地选择，没有点击“生成并复制”，因此没有创建 secure handoff grant/package fixture，无 revoke/TTL cleanup 需求。本地前端进程和本 worker browser sessions 均已停止，build、coverage 和截图生成物已清理。

## 60 部署与真实页面复核

- 使用既有部署脚本将工作分支提交 `29497601` 更新到 60 Admin；脚本完成镜像构建和容器重建，健康检查通过，构建/启动日志的 fatal 与 panic 计数均为 `0`。未修改 DB、配置、API 或 Insight。
- 部署后使用真实 Admin 登录态访问 `/application-usage-access`。1440 与精确 390 CSS viewport 的 `document/body overflow` 均为 `0`；selector 在 CTA 前，操作区和控件均在视口内且无重叠。
- Enter/方向键可选择组织，选择后 CTA enabled，Tab 可到达 CTA；交互期 console error 为 `0`。观察到 6 个 XHR/fetch，HTTP error 与 network-zero 均为 `0`。
- 未点击“生成并复制”，没有创建 secure handoff grant/package fixture，因此无 revoke 或 TTL cleanup；成功授权摘要继续由 focused Jest 覆盖。

## 剩余风险

- 未生成真实测试接入包，因此成功态的真实 grant 生命周期沿用上一 change 的 60 E2E，当前 change 的成功摘要由 focused Jest 覆盖；后续若点击生成，仍须遵循脱敏与 revoke/TTL cleanup 约束。
