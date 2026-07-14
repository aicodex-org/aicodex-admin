## 验证范围

本记录覆盖应用（含复制）、组织、用户、群组、角色、权限和 Provider 的前端新增草稿流程，并包含群组树、企微/飞书/钉钉组织同步页替代入口和用户组织上下文切换。验证未修改后端、数据库或外部同步配置；浏览器 smoke 未点击保存按钮，也未创建测试 fixture。

## 自动化测试

- 运行 17 个受影响列表页、编辑页、群组树和组织同步 Jest 套件：全部通过，共 `364` 个测试。由于当前 Windows 环境将多套件单进程运行提前终止且不返回 Jest 汇总，最终证据按 suite 隔离运行并在任一失败时立即停止；各 suite 均返回退出码 `0`，测试数量合计为 `364`。
- 额外按 TDD 覆盖了 Provider 映射归一化和实例隔离、应用辅助数据竞态、用户新增组织配置与多地址默认值、用户列表组织配置未就绪及组织切换乱序响应保护、权限空模型、组织重复提交保护、七类新增失败保留草稿标识、七类首次 add 后再次 update，以及旧 add 路由缺少草稿时回退详情读取。应用、组织和 Provider 的 add→edit→update 测试均从生产入口实际使用的 `location.state` 路由草稿初始化，不再手工篡改组件 mode。
- Provider 测试进一步验证 OAuth、Email、SMS、Captcha、Notification、ID Verification 和 Storage 的凭据标签、子类型、App ID、通知接收方及 user/email/SMS 映射控件，避免仅为覆盖行号增加无行为断言。
- 群组树与三个组织同步页的实际按钮测试均断言新增、更新、删除 API 零调用，并校验完整 route state；用户编辑测试覆盖真实 AntD 组织选择、初始 add/edit loading、连续切换乱序、业务/网络失败矩阵和真实 unmount 晚响应。
- 归档前 review 进一步覆盖新增成功后的持久化回读：应用保存并停留时先 GET 服务端对象，确认后端生成的 `clientId` / `clientSecret` 已进入 state 后才允许后续 update；用户保存并停留时同时回读持久化用户和所属组织的应用上下文，两者完成前保存保持 fail-closed。两页的回读业务错误、空数据或网络失败均不会放行更新，卸载后的成功或拒绝晚响应均被忽略；保存并返回直接离开，不执行无意义回读。用户编辑还覆盖 edit/add 组织切换分流、目标用户应用加载中禁用保存、已知缺失应用降级和初始晚响应丢弃。
- 最终独立代码审查发现并修复 Provider 缺少脏草稿离开保护：普通字段和 user/email/SMS 映射修改后均显示未保存状态，新增态取消与编辑态顶部返回均先确认；确认前导航和 add/update/delete 调用保持为零，保存成功后清除脏状态。
- 既有测试输出包含 React 18 legacy render、AntD 静态 message、列表 key 等历史 warning；本 change 未新增 Jest 失败。

## 单测覆盖率

使用 Jest coverage 按对象分组运行；归档前修复后重新生成应用与用户编辑页 coverage，并以 `istanbul-lib-coverage` 与其余最新分组合并，对本 change 触及的 16 个列表页、编辑页、群组树和组织同步 helper 实现文件统计：

- Statements：`86.95%`（`2932/3372`）
- Branches：`71.19%`（`2158/3031`）
- Functions：`83.85%`（`1091/1301`）
- Lines：`86.94%`（`2864/3294`）

Statements 与 Lines 已达到归档门禁要求的 `85%`。Branches 与 Functions 仍低于 `85%`，主要来自历史大型编辑页的大量条件渲染；本轮保留为非阻塞测试改进空间。统计未排除任何受影响实现文件，新增 Provider 覆盖验证的是用户可见字段契约和映射交互，不是只为命中行号的低价值测试。

## 静态与构建验证

- `yarn typecheck`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn build`：通过；仅有项目既有 Browserslist 数据过期和 bundle size 提示。
- `git diff --check`：通过。
- `openspec validate fix-large-edit-draft-creation --strict`：通过。

## 受控浏览器 smoke

使用本地 React 前端代理到 60 测试后台，并在登录完成后注册“所有非 GET 请求返回 `405`”的浏览器 route。逐页验证应用、组织、用户、群组、角色、权限和 Provider：

- 列表点击“添加”均进入带随机草稿标识的编辑路由。
- 每页“保存”“取消”和顶部“返回”均可见。
- 首次草稿点击“取消”均返回原列表；第二次草稿点击顶部“返回”均返回原列表。
- 七页均未出现页面级横向溢出。
- 未点击“保存”或“保存并返回”；route 匹配到的非 GET 请求数量为 `0`，因此未触发新增、更新、删除或外部同步请求。
- 浏览器未出现 page error；console 记录到 `18` 条项目既有 React/AntD warning，主要为未挂载组件异步更新、deprecated `Input.Group` 和列表 key 提示。

脱敏截图和 JSON 摘要保存在 ignored 目录 `output/playwright/fix-large-edit-draft-creation/`，不包含登录凭据、Cookie、token 或后台完整地址。

补充 smoke 继续使用同一只读拦截边界，覆盖此前代码审查发现的替代入口和用户组织上下文切换：

- 群组树根群组“添加”进入 `/groups/<organization>/<random-draft>` 草稿路由；取消后返回原组织树，未调用新增、更新或删除 API。
- 企业微信、飞书和钉钉组织同步页“新建组织”均进入 `/organizations/<random-draft>` 草稿路由；取消后返回组织列表，未调用组织 mutation 或外部同步请求。
- 用户新增页选择 AntD 明确标记为未选中的另一个组织，并将实际 `GET /api/get-organization` 延迟 `500ms`：请求等待期间“保存”禁用，上下文完整返回后恢复启用。
- 补充 smoke 的非 GET 拦截数量为 `0`、page error 为 `0`，五个观察点的页面级横向溢出均为 `false`。console 记录 `8` 条项目既有 React/AntD warning，未出现新的运行时异常。
- 脱敏摘要为 `output/playwright/fix-large-edit-draft-creation/readonly-alternate-entry-summary.json`；截图覆盖群组树草稿、三个同步入口的组织草稿和用户组织切换完成态。证据目录已忽略，不提交账号、Cookie、token 或完整后台地址。
- Provider 脏草稿修复后追加只读浏览器复验：修改显示名称后右上角出现“未保存”，点击取消展示确认离开弹窗；在弹窗内点击取消后仍停留在原草稿路由。该步骤的非 GET 拦截数量为 `0`、page error 为 `0`、页面级横向溢出为 `false`，未点击保存或确认离开。脱敏摘要与截图分别为 `readonly-provider-dirty-summary.json` 和 `provider-dirty-discard-confirm.png`，均位于同一 ignored 证据目录。

## 剩余风险

- Branches 与 Functions 覆盖率仍低于 Statements/Lines，后续修改历史大型编辑页的条件渲染时仍应按对应 Provider 类型补充聚焦测试。
- 浏览器 smoke 证明的是本地前端接入 60 测试后台时的只读交互边界；由于按约束未点击保存，它不作为真实新增 API、数据库持久化或外部同步成功的端到端证据。
- 既有 console warning 不阻断本次草稿写入边界，但应由后续专门的 React/AntD 测试与组件卫生 change 处理。
- 应用或用户首次新增后若持久化对象或用户组织应用上下文回读失败，页面会保持保存类操作禁用；对象已经创建，管理员可取消或返回后从列表重新进入，避免用不完整草稿覆盖服务端生成或归一化字段。
