## Why

最新 non-silent React 18 回归仍稳定暴露三条非 AntD runtime warning：Provider 编辑页会在组件尚未挂载或生命周期已失效后提交异步状态，Webhook 与角色列表的单元格 children 则缺少稳定 key。它们既污染运行时诊断，也分别暴露了旧请求覆盖新路由和列表元素 identity 不稳定的真实风险，需要在继续清理其它 warning 前建立明确契约。

## What Changes

- 将 Provider 编辑页的数据加载从 pre-mount 生命周期迁到已挂载生命周期，并用路由/请求世代阻止卸载、路由切换或乱序响应提交过期状态、副作用和导航。
- 保持 Provider 新增、编辑、保存成功/失败、loading 恢复和路由行为；过期保存完成仍释放实例内并发锁。
- 在 Webhook events 与角色关联对象单元格内使用基于业务值和同值出现序号的局部复合 key，保持可见顺序、链接、颜色和重排 identity。
- 以 non-silent warning guard、异步生命周期、重复数据和稳定重排测试固定回归边界，不增加 console suppression、sleep、skip/only 或全局测试配置。

## Capabilities

### New Capabilities

- `web-admin-provider-unmount-list-key-contract`: 约束 Provider 编辑页异步生命周期与 Webhook/角色列表单元格的稳定元素 identity。

### Modified Capabilities

无。

## Impact

- 前端生产代码：`ProviderEditPage.tsx`、Webhook 列表页与角色列表页的局部 renderer。
- 前端测试：Provider 异步生命周期、Webhook events 与角色关联对象的重复/重排场景。
- 不改变后端 API、认证/权限、路由定义、依赖与 lockfile、Provider 字段、列表排序或用户可见文案。
