## Why

企业微信和飞书组织同步已经开始共用“同一业务组织只能有一个通讯录主数据源”的规则，但当前状态查询、页面提示和执行兜底仍散落在各 Provider 页面与服务中。继续按页面分别拼接状态，会让“普通占用”和“异常双配置”难以区分，也会让后续钉钉等来源重复实现同一套判断。

## What Changes

- 新增统一的组织通讯录来源状态能力，定义每个业务组织当前的通讯录来源占用、冲突和数据异常状态。
- 新增统一后端状态契约，供 WeCom、Feishu 和未来 DingTalk 等 Provider 查询同一套 source status。
- 企业微信和飞书同步页改为消费统一状态，不再各自推断另一 Provider 的占用关系。
- 页面区分普通“被其他来源占用”和“数据异常：同组织存在多个已配置来源”，异常双配置只允许查看和排障，不展示成普通占用。
- 保存配置、手动同步和定时同步执行前共用统一判断逻辑，避免规则在不同入口漂移。
- 为未来 DingTalk 预留 source 枚举和状态模型扩展点，但本 change 不实现钉钉页面、钉钉同步配置或迁移工具。
- P0 不新增统一菜单页；只在现有企业微信/飞书同步页使用统一状态和共享提示组件。

## Capabilities

### New Capabilities
- `organization-directory-source-status`: 定义 Admin 业务组织的通讯录来源状态、占用判断、异常双配置识别和统一接口契约。

### Modified Capabilities
- `wecom-organization-sync`: 企业微信同步页面和执行入口改为消费统一组织通讯录来源状态。
- `feishu-organization-sync`: 飞书/Lark 同步页面和执行入口改为消费统一组织通讯录来源状态。
- `organization-sync-scheduler`: 定时同步派发前改为使用统一通讯录来源状态判断是否允许执行。

## Impact

- 后端：新增统一 source status service/model/API；调整企业微信、飞书配置保存、手动同步和 scheduler executor 的互斥判断入口。
- 前端：企业微信和飞书组织同步页共享 source status 数据结构、状态提示组件、组织下拉过滤逻辑和异常双配置文案。
- OpenSpec：新增统一通讯录来源状态规格，并修改企业微信同步、飞书同步和组织同步调度规格。
- 测试：补充 Go service/controller/scheduler 测试、前端 Jest 测试和 OpenSpec strict 校验；P0 不要求真实钉钉联调。
