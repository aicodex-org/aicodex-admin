## Why

`应用接入 > 用量接入 > 服务凭据治理` 仍然把 owner 诊断、Evidence 元数据、机器 alias 和配置修正动作暴露得过多。运维默认只需要知道交接包是否可生成、缺什么交接材料、下一步动作是什么；过多诊断和配置细节会让页面难以判断“该交付什么”。

## What Changes

- 将 `用量接入` 页收敛成 KISS 的 Admin 交接包页：首屏只保留面包屑、标题、服务凭据治理状态、下一步和一个生成 Admin 交接包动作。
- 默认不展示诊断元数据、Evidence 元数据、stable alias、owner/source/boundary、Doctor 详情或机器 reason code。
- 当 Admin 部署配置缺失时，只展示 `待补配置`、缺失 key 和“到 Admin env/config 补齐后重启刷新”的提示，不在页面内保存 secret 或配置修正。
- 当材料齐备时，只展示 `Admin 交接包` 生成与复制；生成结果是 copy-safe JSON，仅作为 Insight Admin provider 辅助交接包。
- 删除页头副标题、横向快捷入口、高级修正、保存修正、读取当前值、Doctor/诊断详情和重复的交接包折叠区。

## Non-Goals

- 不新增后端接口、schema 或持久化字段。
- 不承接 API/Gateway 或 Insight truth，不生成 API 用量主配置包。
- 不输出 token、secret、Cookie、Authorization、完整私有 URL、raw payload/raw id、真实账号或完整组织树。
