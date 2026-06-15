## Why

飞书组织同步已经具备配置、dry-run preview、dry-run history、正式运行记录和飞书扫码登录的基础拉通。下一步需要让 operator 在正式同步前能看见用户身份绑定风险：`user_id -> User.Lark` 是主绑定，历史 `open_id` / `union_id` 兼容匹配可以避免重复创建用户，但一旦本地存在多用户、多租户或 endpoint mode 不一致的历史数据，正式同步可能覆盖错误账号或产生重复账号。

当前 dry-run diff 只给出用户新增/更新/冲突计数，不能解释“哪些绑定规则有风险、风险级别是什么、应该如何处理”。因此需要新增 Admin-owned 的只读绑定冲突诊断 console。

## What Changes

- 新增 Feishu/Lark 用户绑定冲突诊断 read model/service/API，基于 Admin 本地 Feishu mapping、`User.Lark`、Lark OAuth identifier properties、最近 dry-run history 和 sync run metadata 生成脱敏诊断摘要。
- 诊断识别以下 P0 风险：
  - 同一 Feishu `user_id`/mapping 指向多个本地用户。
  - 同一 local user 关联多个 tenant/user_id。
  - 历史 `open_id`/`union_id` 兼容匹配可能落到不同本地用户，存在重复用户风险。
  - 缺少 `tenant_key` 或本地 OAuth endpoint mode 与同步配置 endpoint mode 不一致。
- 输出 safe summary、risk level、stable hash/sample、recommended operator action、blocked reason、sourceConnectionIdHash、run/history linkage 和 redaction metadata。
- 前端飞书组织同步页面新增“绑定冲突 / 身份匹配诊断”只读区域或 Drawer，覆盖 loading、empty、error、disabled 状态，并支持复制/导出脱敏 JSON。

## Non-Goals

- 不执行真实同步修复。
- 不修改 `User`、`Group`、`PlatformUser`、`PlatformMembership`、Feishu mapping、Gateway facts 或 Insight 过滤。
- 不触发 projection publish。
- 不读取真实 Feishu/Lark secret，不触发真实租户同步，不写真实租户 fixture。
- 不改 API/Gateway/Insight 内部库，不修改企业微信同步实现。

## Impact

- 后端：新增 object/service、controller、router、鉴权测试和 focused tests。
- 前端：扩展 `FeishuOrganizationSyncBackend` 和 `FeishuOrganizationSyncPage`。
- OpenSpec：扩展 `feishu-organization-sync` 主规格，记录只读诊断和 UI 契约。
- 安全：所有输出必须脱敏，不返回手机号、邮箱、真实姓名、完整组织树、token、Cookie、私有 URL 或 raw Feishu response。
