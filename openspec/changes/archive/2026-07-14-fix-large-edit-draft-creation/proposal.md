## Why

已迁移到统一大型编辑壳的应用、组织、用户、群组、角色、权限和认证源页面，列表“添加”仍会在打开编辑页前调用新增接口，并在取消或返回时删除该临时记录。这会造成未经明确保存的数据写入和误导性的“添加成功”提示。

## What Changes

- 统一上述七类对象的“添加”及应用“复制”流程为前端路由草稿：进入编辑页前不调用新增接口、不显示新增成功。
- 同步覆盖群组树的根/子群组入口，以及企微、飞书、钉钉组织同步页的“新建组织”入口，避免替代入口继续预创建后台记录。
- 新增模式从路由 state 读取草稿并跳过不存在对象的详情查询；只有保存或保存并返回才调用新增接口。
- 新增成功后转换为编辑模式，后续保存仍调用既有更新接口。
- 新增草稿的取消、顶部返回和确认放弃未保存修改只返回列表，不调用新增、更新或删除接口。
- 补充对象级回归测试和受控前端预览验证；验收拦截全部非 GET 请求，不触发真实同步或数据库写入。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`：统一应用、角色和权限大型编辑壳对象的新增草稿、保存和离开语义。
- `admin-enterprise-organization-identity-center`：统一组织、群组和用户编辑壳对象的新增草稿、保存和离开语义。
- `admin-enterprise-identity-auth-source-center`：统一 Provider 新增草稿、保存和离开语义。

## Impact

- 前端页面：`Application`、`Organization`、`User`、`Group`、`Role`、`Permission`、`Provider` 的列表页、编辑页、群组树、组织同步目标组织 helper 及聚焦测试。
- 应用接入中心和认证源中心只复用上述对象页入口；本次不改变它们的只读事实归属、路由或后端 API 契约。
- 后端、数据库、权限模型、真实同步、API endpoint 与 payload 字段均不变；仅改变前端何时调用既有新增接口。
