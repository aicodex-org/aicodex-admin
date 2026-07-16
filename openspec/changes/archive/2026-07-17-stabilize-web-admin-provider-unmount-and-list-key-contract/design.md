## Context

上一轮 React 18 异步边界治理后的固定 test environment、non-silent、串行 focused 组合为 3 suites / 96 tests / 0 failure，但稳定输出三条本 change 负责的 warning。最新 stack 与 owner 矩阵如下：

| Warning | Stack/首个无 identity 元素 | Production owner | 当前触发 fixture |
| --- | --- | --- | --- |
| `Can't call setState on a component that is not yet mounted` | `ProviderEditPage.tsx` organizations promise completion | `ProviderEditPage` pre-mount 请求及无失效保护的异步完成 | `ProviderEditPage.test.tsx` 手工调用 `UNSAFE_componentWillMount` |
| `Each child in a list should have a unique key prop` | rc-table `Cell` 内首个无 key 元素为 AntD `Tag` | `WebhookListPage` events 列调用 `Setting.getTags` | application access fixture 的 `events: ["login", "signup"]` |
| `Each child in a list should have a unique key prop` | rc-table `Cell` 内首个无 key 元素为 Router `Link` | `RoleListPage` users/groups/roles 列调用 `Setting.getTags` | role list 关联对象 fixture |
| 修复上述 Link owner 后显露的同类 `unique key` warning | rc-table `Cell` 内首个无 key 元素为 AntD `Tag` | `PermissionListPage` resources/actions 列调用 `Setting.getTags` | permission list resources/actions fixture |

Provider 当前在 `UNSAFE_componentWillMount` 启动 organizations、provider 与 certificate 请求，且没有 unmount、路由 identity 或请求乱序保护；保存、删除和 SAML metadata fetch completion 也会无条件提交 state、message 或 history。同一 `/providers/:organizationName/:providerName` 元素可在路由参数变化时复用组件实例，旧请求可能覆盖新路由。共享 `Setting.getTags` 返回无 key 的 `Tag`/`Link` 数组，但其调用面超出本 change 写集；本 change 只修复 Webhook、Role 和 Permission focused 组合已确认的 owner。Permission owner 在 Role Link 修复后才由 React 不再去重的 non-silent stack 显露，因此作为同一 RolePermission 写集内的实现期 Fixable 证据补入。

## Goals / Non-Goals

**Goals:**

- 保证 Provider 仅在当前已挂载的路由/请求世代提交 state、message、history 和其它 UI 副作用。
- 保证卸载、Provider 路由切换、同类请求乱序和证书 owner 切换不会让旧响应覆盖当前页面。
- 保证 Webhook events、角色关联对象及 Permission resources/actions 在重复值下 key 唯一，在不同值重排时 identity 稳定。
- 保持 loading、成功/失败、保存、列表顺序、链接和操作行为，并使三条目标 warning 归零。

**Non-Goals:**

- 不修改 Provider 后端请求 API、字段、认证/权限、路由定义或取消协议。
- 不重构共享 `Setting.getTags`，不处理没有本次 stack 证据的 `PermissionListPage`。
- 不处理 AntD deprecated/runtime warning、技术债路线文档、依赖版本或全局 Jest 配置。

## Decisions

### 1. Provider 使用已挂载生命周期和请求世代

初次加载移到 `componentDidMount`。组件维护 route generation，并为需要独立乱序保护的加载、保存、删除、SAML metadata 与证书请求记录 generation；completion 同时匹配“仍挂载、当前 route generation、当前 request generation”后才可提交 UI 状态或副作用。`componentWillUnmount` 标记未挂载并使世代失效；`componentDidUpdate` 比较 organization/provider 路由 identity，重置对应页面状态、提升世代并为新路由重新加载。

仅用 mounted flag 不能阻止同一实例内旧路由或乱序响应；仅修改测试无法覆盖 production stale update；引入 `AbortController` 会扩大 backend 请求接口。因此选择组件内 generation guard，复用仓库 legacy class 页面已有模式并保持改动最窄。

保存 completion 失效时不得提交 `setState`、message 或 history，但其 `finally` 仍必须释放实例内 `providerSaveInFlight`，避免旧保存永久占用锁。证书 owner 切换使用独立请求 generation，避免旧 owner 证书覆盖新选择。

### 2. 页面局部 renderer 生成 domain composite key

Webhook events、角色 users/groups/roles/domains 与 Permission resources/actions 分别在页面局部 renderer 中创建与现有 `Setting.getTags` 等价的 `Tag`/`Link`，key 由稳定 scope、业务字符串值与该值此前出现次数组成。Permission actions 使用未翻译 action 作为 identity、翻译后 label 作为显示和颜色输入，避免语言切换改变 domain identity。不同值重排不改变其 key，同值重复仍获得唯一 key；renderer 按原数组顺序输出，继续使用相同颜色算法和 URL 规则。

只用业务值无法处理重复项；数组位置或随机值会在重排时破坏 identity；修改共享 helper 会扩大未审计调用面。因此采用 owner 局部复合 identity。

### 3. RED/GREEN 保留真实 console 与行为

测试使用局部 warning guard：代理原始 `console.error` 以保留 non-silent 输出，并在目标 warning 出现时令测试失败；不 mock React warning，也不过滤其它类别。Provider 通过真实 render、可控 deferred promise、unmount/route rerender 和乱序 resolve 建立 RED/GREEN；列表通过重复数据、重排和 DOM 可见顺序验证 identity。

## Risks / Trade-offs

- [legacy class state 重置遗漏] → 将 route identity 与新增/编辑初始 state 集中处理，并覆盖 add/edit、快速切换、成功/失败和 loading 恢复。
- [generation guard 误丢当前响应] → 每类异步操作在启动时捕获明确 token，只对匹配 token 提交；保存锁释放不依赖 token。
- [重复值 occurrence key 在相同值内部重排不可区分] → 相同字符串在 UI 与域数据上不可区分，occurrence 是当前数据契约下最小唯一 identity；不同值重排保持稳定。
- [局部 renderer 与共享颜色/URL 规则漂移] → 继续调用 `Setting.getTagColor` 并复用原 URL 前缀，只局部承担 element key。

## Migration Plan

1. 先提交能在旧实现上稳定失败的生命周期和 key warning/identity 测试。
2. 实施 generation guard 与局部 renderer，运行 focused non-silent、coverage、全量门禁和真实 Chromium smoke。
3. change 不涉及数据迁移或配置；若回滚，恢复三个页面及其直接测试即可，后端与数据无回滚动作。

## Open Questions

无。当前 warning stack、owner、生命周期策略和 key identity 均已由最新基线证据确认。
