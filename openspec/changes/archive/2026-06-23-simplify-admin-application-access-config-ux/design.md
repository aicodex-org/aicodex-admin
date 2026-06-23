## Context

本 change 是 `用量接入` 已有独立页的首屏降噪，不新增后端 contract，也不扩展到 API/Gateway 或 Insight 的配置中心。用户需要在 `应用接入 / 用量接入 / 服务凭据治理` 默认视图里快速判断当前状态、下一步动作和必填配置，而不是先阅读 owner/source、reason code、handoff evidence 等诊断字段。

## Decisions

- 首屏聚焦操作者视角：只展示总状态、一个主下一步动作和必填配置入口。
- 四类治理项保留为服务凭据治理范围：`Insight provider trust`、`Usage identity resolver`、`Gateway organization projection`、`Keep in env/config`。
- 默认摘要只展示人类可读状态、缺口摘要和下一步，机器 tag、reason code、stable alias、owner/provenance、doctor metadata 和 handoff evidence 收纳到 `高级信息` 或诊断详情。
- 凭据引用输入默认遮挡，页面只处理 Admin-owned 配置别名和策略摘要，不展示 raw secret reference 或下游真实响应。

## Non-Goals

- 不修改 Admin 后端接口、数据结构或权限契约。
- 不新增 API/Gateway 接入凭据 UI、Insight 业务服务接入 UI、登录 Provider、组织同步或泛配置中心。
- 不声明 API provider runtime、Gateway 发布或 Insight consumer import 的跨仓运行态成功。
