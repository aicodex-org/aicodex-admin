## Context

飞书组织同步当前已有配置、连接测试、正式运行记录、运行诊断和 dry-run preview console。dry-run preview API 只返回当前一次聚合结果，不保存历史；operator 离开页面或再次预览后，无法回看最近预览的 diff counts、失败分类、脱敏来源别名和执行人信息。

本 change 属于 Admin-owned Feishu organization sync metadata，不触碰真实 Gateway facts、不读取 API/Gateway/Insight 内部库、不改变企微同步实现。真实飞书/Lark Contact v3 凭证和租户连通性仍是运行态 gate，不是本地实现或归档 gate。

## Goals / Non-Goals

**Goals:**

- 为每次 Feishu/Lark dry-run preview 保存一条脱敏 history/audit 摘要，成功和 fail-closed 都记录。
- 支持 Admin 通过只读 API 按组织、来源连接 hash、状态/诊断 alias、时间范围、limit/topN 查询列表和详情。
- 详情只返回聚合摘要、alias、reason counts、diagnostics alias 与 retention/redaction metadata，不返回 raw Contact payload、完整树或外部用户标识明细。
- dry-run preview 主流程保持 fail-closed：history 持久化失败不得让 preview 成功伪装成写入成功，也不得泄露敏感数据；需要通过安全诊断或 warning 暴露审计保存失败。
- Web Admin 飞书同步页展示最近 dry-run 历史和详情 Drawer，覆盖 loading、empty、error 和长文本场景。

**Non-Goals:**

- 不新增真实租户 fixture，不读取或输出真实 App Secret，不触发真实租户同步。
- 不发布 Gateway authorization facts，不改变 Insight 过滤和管理范围。
- 不保存 raw Contact payload、完整部门树、完整用户列表、手机号、邮箱、`open_id`、`union_id`、`user_id` 明细。
- 不改企微组织同步；企微已有正式同步 run history，但本 change 不补企微 dry-run history。

## Decisions

1. **新增 Feishu dry-run history 表，而不是复用正式 sync run 表。**
   - 原因：dry-run 不是正式执行，不应污染正式 run history 或调度状态；它需要保存 preview-specific diff/reason/retention metadata。
   - 替代方案：给 `FeishuOrganizationSyncRun` 增加 dry-run trigger。该方案会混淆“已执行同步”和“仅预览”，也增加正式同步状态机风险。

2. **持久化聚合字段和 JSON 摘要，不保存明细 payload。**
   - history model 保存组织、request marker、source alias hash、snapshot counts、diff counts、reason counts JSON、diagnostics JSON、retention/redaction flags。
   - 这些字段足够支持列表/详情和审计判断，同时避免任何原始通讯录明细进入数据库。

3. **通过 preview service 接入 history 记录，controller 传入 operator hash。**
   - controller 负责解析组织和 session user，并将 request marker/operator hash 传给 service。
   - preview service 无论成功还是 fail-closed 都尝试记录 history；内部存储失败只追加安全 diagnostics/warning，不改变已计算 preview 的敏感边界。

4. **列表默认返回最近记录，详情返回同一条脱敏摘要。**
   - 列表 API 支持 `organization`、`sourceConnectionIdHash`、`status`、`diagnosticAlias`、`createdFrom`、`createdTo`、`limit`、`topN`。
   - `limit/topN` 做服务端上限，避免一次返回过多历史。

5. **前端复用现有飞书同步页和 Ant Design 表格/Drawer。**
   - 最近 dry-run 历史放在 preview console 和正式同步记录之间或同页相邻区域。
   - 详情 Drawer 展示聚合 diff、reason counts、diagnostics 和 retention/redaction 标记，长文本使用 ellipsis / Typography paragraph 处理。

## Risks / Trade-offs

- **History insert 失败导致 audit trail 缺口** → preview 返回不泄密的 history warning/diagnostics，并在验证记录中覆盖该分支；不把存储错误伪装成 Contact 失败。
- **JSON 字段跨数据库兼容性** → 使用 text 字段保存规范化 JSON，并在 object 层集中 marshal/unmarshal，避免引入新数据库依赖。
- **hash alias 被误认为真实 ID** → 字段命名使用 `*Hash` / `*Alias`，UI 明确展示为来源别名和脱敏标记。
- **查询过宽影响性能** → 按 organization、createdAt、status、sourceConnectionIdHash 建索引，并限制 limit/topN。
