# 验证记录

## 验证范围与证据层级

本 change 修复 Provider 编辑页的失效异步 completion 与 Webhook、Role、Permission 列表单元格 identity。浏览器验证使用本地 production preview 和脱敏 route fixture，不连接真实账号、认证 Provider、60 环境或共享数据库，因此结论限定为前端生命周期、渲染、构建与本地交互层级，不代表真实 Provider 后端端到端验收。

## 根因与 RED/GREEN

- Provider 旧实现从 `UNSAFE_componentWillMount` 发起请求，且 organizations/provider/certs/save/delete/SAML metadata completion 没有 mounted、route 或 request generation；RED 稳定证明路由切换不加载新 Provider、旧证书乱序覆盖、卸载后删除仍导航、卸载后 metadata 仍提交消息。
- `WebhookListPage` events 与 `RoleListPage` 关联对象调用无 key 的共享 `Setting.getTags`；RED 中 Tag/Link key 均为 `null`，真实 rc-table Cell 输出 unique-key warning。
- 修复 Role Link owner 后，React 不再按相同 Cell stack 去重，进一步显露 `PermissionListPage` resources/actions 的无 key Tag；该 owner 属于已授权 RolePermission 写集，已补入 OpenSpec 与同一复合 identity 契约。
- GREEN：Provider 使用 `componentDidMount`、route/request generation 和 unmount invalidation；旧保存 completion 不提交消息/导航，当前路由仍可继续保存。三个列表页以 scope、未翻译业务值和同值出现序号生成局部 key，保持顺序、链接、翻译和颜色。

## 聚焦测试与覆盖率

- focused non-silent Jest：3 suites / 102 tests / 0 failure，Provider unmounted warning=0，unique-key warning=0，无 console suppression、sleep、skip/only 或 timeout 放宽。
- 旧实现 RED：3 suites 中 7 个失败；覆盖新路由请求缺失、证书乱序、卸载后删除/SAML completion，以及 Webhook/Role key 均为 `null` 和真实 warning。
- rebase 最新 base 后再次用 Istanbul statement map 与 `git diff --unified=0` 交叉统计本次新增可执行代码：changed statements 100/104 = 96.15%，changed lines 99/103 = 96.12%，达到 85% 门槛。其中 Provider 为 80/84 statements、79/83 lines，Webhook/Role/Permission 三个局部 renderer 均为 100%。
- 四个 changed production 文件的完整 collect target 另为 statements 94.30%（795/843）、lines 94.35%（786/833）、branches 83.81%、functions 90.87%；该全文件数字只作补充，没有替代 changed coverage。

## 自动化、类型与构建

- 增量 TypeScript gate：通过。
- `yarn typecheck:build-tooling`、`yarn typecheck:e2e`：通过。
- `yarn lint` 与 changed tests 的聚焦 ESLint：通过，只保留既有 `caniuse-lite` 更新提示。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：通过。
- `yarn build`：通过，只保留既有 browser external、direct eval 与 chunk-size warning。
- `yarn test:e2e:list`：19 个文件 / 22 个 Chromium tests。
- `yarn install --frozen-lockfile`：通过且 package/lock 无 diff；诊断发现首次运行的本地 `node_modules` 仍是 AntD 5.24.1，而基线 lockfile 已固定 5.29.3。对齐后原 13 条 `destroyOnHidden` 类型错误和 3 个重开测试失败消失，证明它们来自 stale dependency materialization，不是本 change 或并行源码缺陷。
- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`：最终均通过。
- rebase `origin/hfl-test-base@898dbb30` 后 full non-silent Jest：154 suites / 1464 tests / 0 failure；Provider unmounted、unique-key 与 AntD warning 均为 0。rebase 前 47 条 AntD warning 保持可见，归零来自上游独立 owner change，而不是本 change 过滤。
- rebase 后 `yarn test:ci`：154 suites / 1464 tests / 0 failure。

## Chromium production preview

- Provider：在 1440px 下挂起旧 Provider 请求，快速离开到 Role 后返回新 Provider，再释放旧响应；最终标题、字段和值保持 `GitLab Current`，未被 `GitHub Stale` 覆盖。
- Webhook、Role、Permission：1440px 与 390px 均加载包含重复业务值的脱敏 fixture；Permission 页面可见 `resource-a` 两项和 `Read` 两项，Role/Webhook 同样保持输入顺序。
- 7 个页面/viewport case 的 `documentElement.scrollWidth`、`body.scrollWidth` 均等于 viewport（1440 或 390），页面级横向 overflow=0；移动表格保持既有内部横向滚动。
- console warning/error=0、page error=0、request failure=0；所有 fixture API 返回本地 200。Provider 桌面与 Role 390px 截图经目视检查，无重叠、裁切或页面级溢出，closeout 前删除。
- 上游 rebase 只修改独立 AntD owner 页面、测试和规格，未触及本 change 三个目标路由、共享布局或 fixture contract；rebase 后 focused、全量 Jest、三类 typecheck、lint 和 Vite build 已重跑，因此浏览器结果按未变化的目标 browser graph 复用。

## 边界与剩余风险

- 本地 fixture 不证明真实 Provider 保存、删除、证书或 SAML metadata 后端协议；本 change 未修改这些 API contract。
- 相同字符串重复项在域语义上不可区分，因此 occurrence 只区分同值副本；不同业务值重排的 identity 保持稳定。
- frozen install 的既有 peer dependency 与 Node `url.parse` 提示未由本 change 引入，也未修改依赖或 lockfile；最终类型、Jest 与构建已在 lockfile 对齐状态通过。
