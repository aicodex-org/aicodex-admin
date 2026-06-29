## Context

当前企业微信和飞书组织同步已经各自返回 `defaultOrganization`、`conflictingProvider`、`conflictingOrganizations` 等摘要，并在保存、手动同步和调度执行前做互斥校验。这解决了两个页面的直接误选问题，但规则仍分散在 Provider 自己的 service、controller 和页面状态里。

后续接入钉钉或其他通讯录来源时，如果继续复制这套状态查询和判断，会出现三个问题：状态字段随 Provider 漂移；页面难以统一展示“普通占用”和“异常双配置”；保存、手动同步、定时同步的 fail-closed 规则可能不一致。

## Goals / Non-Goals

**Goals:**

- 建立统一的组织通讯录来源状态模型，覆盖 WeCom、Feishu/Lark，并预留 DingTalk source 枚举。
- 让保存配置、手动同步和定时同步在后端共用同一套 allow/deny 判断。
- 让企业微信和飞书页面共用状态消费逻辑、候选组织过滤和冲突/异常提示。
- 把“被其他来源占用”和“同组织存在多个已配置来源”区分为不同状态，异常双配置必须 fail-closed。

**Non-Goals:**

- 不新增统一菜单页或“组织通讯录来源状态”独立页面。
- 不实现钉钉同步页面、钉钉配置保存、钉钉同步执行或迁移工具。
- 不自动修复既有双配置脏数据；只识别、展示并阻止继续写入或执行。
- 不改变已有 WeCom / Feishu 同步配置表和 mapping 表结构，除非实现时发现必须补充无破坏字段。

## Decisions

1. **新增统一 service/model，Provider service 只注册自身状态来源。**

   统一 service 负责聚合各 Provider 配置状态并输出组织级 `sourceStatus`。WeCom、Feishu 当前配置 store 作为 provider adapter 被读取，未来 DingTalk 只需要注册新的 adapter。替代方案是在各 Provider service 继续互相查询，但那会让每新增一个 Provider 都产生 N 对 N 判断。

2. **状态契约区分 `available`、`owned`、`occupied`、`ambiguous`。**

   `available` 表示没有通讯录来源配置；`owned` 表示当前 Provider 是该组织的唯一已配置来源；`occupied` 表示另一个 Provider 是唯一来源；`ambiguous` 表示同一组织存在两个或更多已配置来源。替代方案是继续用 `conflictingConfigured=true` 表示所有冲突，但这无法向管理员解释双配置是数据异常，不是正常占用。

3. **统一判断返回机器可读 reason code，所有写入口 fail-closed。**

   保存配置、手动同步和 scheduler dispatch 调用统一判断方法，返回 `allowed=false` 时携带 `source_occupied`、`source_ambiguous`、`source_status_unavailable` 等安全 reason code。页面文案基于 code 渲染，后端错误不包含 secret、token 或原始 provider 响应。替代方案是只统一读取接口，执行入口仍各自判断；这会保留当前漂移风险。

4. **前端共享状态消费和提示组件，不引入新页面。**

   P0 只在现有企业微信/飞书同步页复用一个轻量组件或 helper，保持页面入口不变。统一菜单页可以后续再开 change；当前问题主要发生在配置页选择组织和执行动作上。

## Risks / Trade-offs

- **已有测试环境或线上数据存在双配置** → 页面会显示“数据异常”并禁用写入/同步；管理员需要通过数据治理或新建组织处理，P0 不提供解除入口。
- **统一状态查询需要扫描多个 Provider 配置表** → P0 Provider 数量很少，配置表规模远小于用户和关系表；实现先保持直接查询，后续 Provider 增多再评估索引或缓存。
- **旧前端连接新后端或新前端连接旧后端** → 新前端应兼容旧字段缺失，优先使用统一状态，缺失时可维持现有保守兜底；新后端保留现有配置响应字段一段时间，降低联调风险。
- **DingTalk 枚举预留可能过早** → 只预留 source type 和展示名称，不实现任何钉钉行为，避免把未来需求提前固化到页面流程。

## Migration Plan

1. 新增统一状态 service/model/API 和 Provider adapter 注册。
2. 将 WeCom、Feishu 保存配置、手动同步、scheduler dispatch 改为调用统一判断。
3. 将 WeCom、Feishu 配置响应接入统一状态，同时保留旧字段兼容前端。
4. 将两个页面切换到共享 source status helper/组件，并补异常双配置显示。
5. 通过 Go 聚焦测试、前端 Jest、TypeScript、OpenSpec strict 和本地/60 环境 smoke 验证。

Rollback 策略：若统一状态接口出现阻断问题，可回滚到上一版 Provider 内部互斥逻辑；该 change 不要求数据迁移，因此 rollback 不需要表数据恢复。

## Open Questions

- 统一状态 API 的最终路径建议为 `/api/organization-directory-source-status`，实现前需确认是否已有更贴近项目命名的模块路径。
- 异常双配置的排障入口 P0 只展示提示还是提供复制脱敏状态 JSON，需要实现前结合页面空间确认。
