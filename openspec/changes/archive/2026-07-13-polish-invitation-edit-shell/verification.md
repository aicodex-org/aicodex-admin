# 验证记录

## 授权与边界

- 本 change 只修改 `web-admin` UI、样式、i18n、shell 路由分类与 OpenSpec 文档；未修改后端、数据库、API endpoint、请求 payload、权限或认证语义。
- RC smoke 按用户授权使用仓库 `local-dev/.env` 的前端端口、60 测试后台代理目标和健康路径；只确认配置类别与脱敏连通结果，未输出 backend URL、Cookie、token、账号密码或响应体。
- 未读取额外测试环境/运维凭据文件，未创建数据库 fixture，未重启 60 服务，未触发外部同步。
- 既有浏览器登录态已过期；未填写登录表单。最终视觉验收使用临时开发 harness 渲染实际 `InvitationEditPage`，5 类 GET 使用脱敏 fixture，所有非 GET fetch 返回 405。harness 与临时 auth state 已删除，未进入提交。

## 自动化测试与覆盖率

- `yarn test InvitationEditPage.test.tsx StyleModuleTopology.test.ts IdentityObjectEditFormLayout.test.ts --watchAll=false --runInBand`
  - 结果：3 个 suite、23 个测试通过。
  - 覆盖：加载、404、组织切换、普通/正则邀请码、复制链接、发送成功/失败、保存/保存并退出、失败回滚、删除、公共 shell、4 个 section、14 个 field row、唯一固定底栏和样式聚合。
- `NODE_OPTIONS=--max-old-space-size=1536 yarn test ManagementPage.shell.test.tsx --watchAll=false --runInBand`
  - 结果：1 个 suite、28 个测试通过。
  - RED/GREEN：加入邀请码路由用例后先因外层 `content-warp-card` 失败；将邀请码详情路由加入 cardless 白名单后通过。
- `NODE_OPTIONS=--max-old-space-size=1536 yarn test InvitationEditPage.test.tsx ManagementPage.shell.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/InvitationEditPage.tsx --collectCoverageFrom=src/ManagementPage.tsx`
  - 结果：2 个 suite、40 个测试通过。
  - `src/InvitationEditPage.tsx`：Statements 95.37%、Branches 80.76%、Functions 94.64%、Lines 95.28%。本 change 的 33 个可执行改动行中 29 行被覆盖，changed executable line coverage 为 87.88%，达到 85% 目标；未覆盖的 4 行是邀请码、复制和发送控件的事件分支，相关业务方法已有独立行为测试。
  - `src/ManagementPage.tsx`：大文件全文件覆盖率不作为本 change 门禁；新增邀请码 cardless 路由所在 `largeEditPageCardlessPatterns` 数组语句覆盖 1/1，执行 53 次。
- 测试输出存在仓库当前 Testing Library 旧版 `ReactDOM.render` 的 React 18 deprecation warning；最终真实浏览器会话无对应运行时 warning。

## 静态与构建验证

- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn test InvitationEditPage.test.tsx ManagementPage.shell.test.tsx StyleModuleTopology.test.ts IdentityObjectEditFormLayout.test.ts --watchAll=false --runInBand`：4 个 suite、53 个测试通过。
- `yarn build`：exit 0，`Compiled successfully`；保留仓库既有 Node deprecation、Browserslist 数据过期和 bundle size 提示。
- zh/en locale JSON 解析：通过。
- `git diff --check`：通过。
- `openspec validate polish-invitation-edit-shell --strict`：通过。
- 归档前 review：proposal、design、tasks、delta spec、实现、测试、注释、文档语言、证据层级与脱敏边界一致，本次审查范围内未发现阻断问题。
- archive 已将 delta spec 同步到主规格；`openspec validate --changes --strict` 无 active change，`openspec validate --specs --strict` 共 34 个主规格通过。

## 归档后按钮一致性复验

- TDD RED：把邀请码页期望改为正文 small 发送按钮和编辑模式三按钮底栏后，14 个聚焦测试中 4 个按预期失败，失败原因为缺少 `Save and return`、编辑模式取消按钮和 `.ant-btn-sm`。
- TDD GREEN：实现取消分流、邀请码域双语 `Save and return` 文案与 small 发送按钮后，`InvitationEditPage.test.tsx` 14/14 通过；新增模式取消删除、编辑模式取消仅返回列表均有直接行为断言。
- Coverage：`InvitationEditPage.tsx` Statements 95.53%、Branches 80.76%、Functions 94.73%、Lines 95.45%，继续达到受影响文件 85% 门槛。
- 1280×900：发送按钮 `43.3×24`；底栏按钮依次为“取消 / 保存 / 保存并返回”，尺寸 `74×32`、`74×32`、`92×32`；document `1280/1280`，overlay=false。
- 390×844：三枚底栏按钮完整可见，document `390/390`，overlay=false；console 0 error / 0 warning。
- 新截图：`output/playwright/invitation-buttons-1280.png`、`output/playwright/invitation-buttons-390.png`。
- 复验继续使用脱敏 GET fixture，所有非 GET 请求返回 405；未点击取消、保存、保存并返回、发送、复制或删除。

## 归档后新增草稿语义复验

- 行为修订：列表“添加”只创建路由内前端草稿并打开新增编辑页；新增页保存或保存并返回时才调用 `addInvitation`。新增保存成功后页面状态切换为编辑模式，后续保存走 `updateInvitation`。新增页取消和顶部返回只回列表，不调用新增、更新或删除接口。
- 聚焦测试：`CI=true yarn test InvitationListPage.test.tsx InvitationEditPage.test.tsx --runInBand`，2 个 suite、26 个测试通过。覆盖“添加”不调用 `addInvitation`、路由草稿加载、取消/顶部返回不写入、新增保存调用 `addInvitation`、成功后再次保存调用 `updateInvitation`。
- Changed-file coverage：`CI=true yarn test InvitationListPage.test.tsx InvitationEditPage.test.tsx --runInBand --coverage --collectCoverageFrom=src/InvitationListPage.tsx --collectCoverageFrom=src/InvitationEditPage.tsx`，2 个 suite、26 个测试通过；`InvitationListPage.tsx` Statements 100%、Branches 88.57%、Functions 100%、Lines 100%；`InvitationEditPage.tsx` Statements 93.69%、Branches 81.35%、Functions 94.44%、Lines 93.57%；合计 Statements 95.62%、Branches 84.04%、Functions 95.83%、Lines 95.51%。
- 静态与构建：`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` 通过；`yarn typecheck` 通过；`yarn build` exit 0，`Compiled successfully`，仅保留仓库既有 Node deprecation、Browserslist 数据过期和 bundle size 提示。
- 受控浏览器：`browser-act get-skills core --skill-version 2.0.2` 因本机 `uv trampoline failed to canonicalize script path` 失败，按 Playwright skill 降级为 `npx --yes --package @playwright/cli playwright-cli`。本次真实登录态不可用，因此使用本地前端 dev server 与 Playwright route 拦截所有 `/api/**`；GET 返回脱敏 fixture，非 GET 返回 405。
- 浏览器操作：打开邀请码列表，点击“添加”，在新增编辑页对 `.admin-large-edit-scroll-content` 做顶部/中段/底段滚动截图，再点击取消返回；再次点击“添加”后点击顶部返回。结果 `writeRequests: []`，全过程未观察到任何 POST/PUT/PATCH/DELETE `/api/**` 请求，`pageErrors: []`。仅有一个既有 `InvitationListPage` 未挂载 `setState` React warning，和本次新增写入语义无关。
- 新截图：`output/playwright/invitation-list-controlled.png`、`output/playwright/invitation-add-draft-top.png`、`output/playwright/invitation-add-draft-middle.png`、`output/playwright/invitation-add-draft-bottom.png`、`output/playwright/invitation-after-cancel.png`、`output/playwright/invitation-after-header-back.png`。
- 边界：本次未点击保存、保存并返回、发送、删除或任何真实写入动作；浏览器证据只证明新增草稿、取消和顶部返回路径不会触发写请求，不表述为真实 60 保存链路或数据库端到端验收。

## 归档后组织显示与字段校验复验

- TDD RED：新增组织显示名/技术值分离和非法名称、邮箱阻止保存的两个测试后，前者因邀请码页未提供 `options`、后者因仍调用更新接口而按预期失败。
- TDD GREEN：组织下拉使用 `displayName || name` 作为标签、`name` 作为保存值；名称为空或不符合 ASCII 技术 ID 字符集、以及非空非法邮箱均显示字段错误并阻止新增或更新请求。编辑名称、邮箱后会清除对应错误状态。
- 聚焦测试：`CI=true yarn test InvitationListPage.test.tsx InvitationEditPage.test.tsx --runInBand`，2 个 suite、28 个测试通过。测试输出仅保留仓库 Testing Library 旧版 `ReactDOM.render` 的 React 18 deprecation warning。
- 静态与构建：`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、`yarn build`、`git diff --check` 均通过；构建仅有仓库既有 Node deprecation、Browserslist 过期和 bundle size 提示。
- OpenSpec：`openspec validate --changes --strict` 无 active change；`openspec validate --specs --strict` 为 34 passed。
- 受控浏览器：`browser-act get-skills core --skill-version 2.0.2` 仍因本机 `uv trampoline failed to canonicalize script path` 不可用，按 Playwright CLI 降级。直连 7002 前端代理时 `/api/get-account` 返回 504，未进行任何写操作。随后以脱敏 GET fixture 打开邀请码列表，所有非 GET `/api/**` 均在浏览器侧返回 405；列表截图保存在 ignored 的 `.playwright-cli/page-2026-07-13T11-55-36-188Z.png`，请求记录中未出现 POST、PUT、PATCH 或 DELETE。受真实代理不可用影响，本轮未把该截图表述为编辑页真实读取或保存链路验收。
- 补充 TDD：新增中文名称 `邀请码` 的 RED 用例时，旧黑名单规则仍调用更新 API；替换为 `^[A-Za-z0-9_-]+$` 白名单后，`InvitationEditPage.test.tsx` 18/18 通过。中文名称应填写到“显示名称”，不作为技术 ID 保存。
- 覆盖率：`CI=true yarn test InvitationEditPage.test.tsx --runInBand --coverage --collectCoverageFrom=src/InvitationEditPage.tsx` 通过；受影响 `InvitationEditPage.tsx` Statements 93.07%、Branches 79.51%、Functions 94.54%、Lines 92.96%，Statements 和 Lines 高于 85% 门槛。

## RC 只读浏览器 Smoke

- 启动：仓库脚本仅启动本地前端代理并连接 60 测试后台；健康检查从配置目标的 `/api/get-account` 收到 JSON。未启动本地 Go 后端，未重启 60 服务。
- 工具：`browser-act` 因本机 uv trampoline 路径故障不可用；降级为 Playwright CLI。最终使用全新会话验证，console 为 0 error / 0 warning。
- DOM：实际 `InvitationEditPage` 渲染 4 个 section；公共头部、路径、滚动正文和唯一固定底栏存在。
- 390×844：document `clientWidth/scrollWidth=390/390`，正文 `375/375`，底栏 bottom=844，最大正文滚动 827，webpack overlay=false。
- 1280×900：document `1280/1280`，正文 `1041/1041`，底栏 bottom=900，最大正文滚动 40，webpack overlay=false。
- 截图：
  - `output/playwright/invitation-edit-390-top.png`
  - `output/playwright/invitation-edit-390-middle.png`
  - `output/playwright/invitation-edit-390-bottom.png`
  - `output/playwright/invitation-edit-1280-top.png`
  - `output/playwright/invitation-edit-1280-middle.png`
  - `output/playwright/invitation-edit-1280-bottom.png`
- 未点击返回、复制、发送、保存、保存并退出、取消、删除或任何其它写操作。

## 清理与剩余风险

- 7001 前端代理按用户预览请求保留运行，由仓库脚本管理；最终交接提供停止命令。未停止或清理无法归因于本任务的既有进程/浏览器会话。
- 已删除临时 preview 源文件、临时 route、临时 storage state；未留下 fixture marker 或待清理数据库记录。
- 本次浏览器证据证明前端布局、滚动、固定底栏、overflow 和无运行时错误；由于未使用有效登录态和真实邀请码记录，不把它表述为 60 真实读取、保存、发送、删除或端到端业务验收。
