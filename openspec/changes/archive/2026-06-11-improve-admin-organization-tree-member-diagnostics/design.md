## Goals

- 在 admin 组织树运营页中补齐“部门下成员是否正确归属”的只读诊断能力。
- 默认保持部门树为主视图，成员只在受控入口中展示，避免组织树页面变成通讯录浏览器。
- 复用 admin 组织主模型、平台成员关系、ExternalIdentity、SourceConnection、OrgSyncBatch lineage 和现有组织树诊断服务。
- 保持 Admin/API/Insight 边界不变：成员诊断视图不是 gateway 授权事实，不是 Insight scope fallback，也不是跨服务长期合同。

## Non-Goals

- 不把用户节点写入组织树 provider envelope 的 `nodes` 主结构。
- 不提供成员源事实编辑、成员关系编辑、权限矩阵编辑或 gateway authorization facts 写入。
- 不让 API/gateway 或 Insight 直接消费 admin 管理页面成员树 JSON。
- 不用手机号、邮箱、昵称或 displayName 作为授权 join key。
- 不在首版做全量通讯录、批量导出、复杂权限矩阵或跨组织人员检索。

## Proposed Design

### 后端诊断模型

组织树运营诊断接口在现有部门节点基础上增加成员诊断数据，建议首版采用部门维度摘要 + 按部门查询成员列表：

- 部门摘要：`memberCount`、`activeMemberCount`、`disabledMemberCount`、`conflictedMemberCount`、`mappingIssueCount`、`staleMemberCount`。
- 成员轻量项：`stableSubjectId`、脱敏 `displayName`、`departmentId`、`lifecycleStatus`、`mappingStatus`、`sourceType`、`sourceConnectionId`、`readModelSource`、`freshness`、脱敏 `lineage`。
- 详情项：点击成员后展示 ExternalIdentity/mapping/read model 诊断摘要，所有个人信息默认脱敏或短显。

如果现有接口一次返回全部节点已经接近页面性能边界，成员列表 SHALL 采用按部门懒加载或分页参数，不随部门树默认加载全量成员。

### 前端交互

组织树节点卡片继续默认展示部门树。新增视图入口：

- `树视图`：只展示部门，作为默认视图。
- `列表视图`：保留现有部门表格。
- `成员视图` 或 `含成员树`：展示部门下成员摘要和成员叶子节点，默认折叠或按部门懒加载。

成员节点视觉上应区别于部门节点，避免误解成员是组织树主节点。成员详情抽屉只用于诊断，不提供编辑动作。

### Fail-Closed 和边界

成员生命周期、mapping、SourceConnection 或 lineage 不可信时，可以展示为诊断项，但不能扩大可见范围。成员 displayName 只能展示，不能作为 join、授权或跨服务 key。API/gateway 仍只消费 admin-to-gateway projection contract，Insight 仍只读消费 admin provider。

## Verification Strategy

- 后端测试覆盖成员摘要、部门成员列表、脱敏、分页/懒加载、异常成员 fail-closed、权限拒绝。
- 前端测试覆盖视图切换、成员摘要展示、成员详情抽屉、空成员部门、异常成员标签和默认不全量展开。
- 60 smoke 使用已知非空组织树测试账号或受控 fixture，记录节点/成员数量级和 UI 信号，不记录真实人员明细、手机号、邮箱、token 或完整响应体。
