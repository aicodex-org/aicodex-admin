## Context

`/applications` 现有 `ApplicationAccessCenter` 已经承载 Application 列表、OAuth/OIDC client、API 映射、Provider 绑定、资源、证书、密钥、Webhook、审计记录以及服务凭据治理摘要/配置/诊断/交接包。用量链路治理项虽然属于应用接入相关，但它们的管理员问题与通用应用接入不同：管理员要核对 Insight provider trust、Usage identity resolver、Gateway organization projection 和 keep-in-env/config 边界，而不是新增 OAuth client 或编辑 Application。

本 change 把原 `应用接入中心` 中的 `服务凭据治理` 详细面板抽成 `应用接入 > 用量接入` 二级入口。它仍在应用接入业务域下，不新增一级菜单或泛配置中心；第一版复用既有 Admin-owned 服务凭据治理前端 client、配置编辑、诊断/预检和交接包生成逻辑，不新增后端契约。

## Goals / Non-Goals

**Goals:**
- 新增 `/application-usage-access` 聚焦页面和 `用量接入` 二级菜单。
- 页面展示服务凭据治理状态、四类治理项、治理配置、保存配置、诊断/预检、交接包预览、加载/错误/空态和脱敏安全边界。
- 保留 `/applications` 应用接入中心作为通用应用接入首页，不破坏其表格、入口、权限和路由。
- 同步 zh/en locale、导航配置树、workspace tab 标题和聚焦测试。

**Non-Goals:**
- 不新增或修改后端 API。
- 不保存 raw secret、token、client secret、私钥、完整私有 URL 或真实下游响应。
- 不触发 Gateway projection publish/refresh、Insight 写入、resolver outbound call、OAuth/OIDC 回调、登录或同步。
- 不把页面扩成服务凭据、Insight、Gateway、API 的泛配置中心。
- 不迁移无关页面，不重做 `ApplicationAccessCenter` 视觉结构。

## Decisions

1. **新增独立 TSX 页面，并把服务凭据治理详细能力从 `ApplicationAccessCenter` 降噪出来。**
   这样可以保持 `/applications` 表格优先，同时让配置、保存、诊断和交接包具备可直达、可测试的页面入口。替代方案是继续把完整治理面板塞到中心页，但会进一步压低通用应用列表和 OAuth/OIDC/API 映射入口。

2. **复用既有 `ApplicationAccessServiceCredentialGovernanceBackend` 与转换逻辑。**
   第一版页面只消费 Admin-owned 脱敏契约，避免新增后端 owner 边界或重复构造 truth。替代方案是前端本地从 env/config 或 Insight/Gateway 字段推导 readiness，但这会违反 owner 边界且容易误报。

3. **导航使用应用接入分组二级叶子 `/application-usage-access`。**
   该入口与 `/applications` 同属应用接入业务域，不新增一级菜单，组织导航配置树继续使用稳定 route key 做权限过滤。

4. **页面文案用 locale key，英文保留治理项专有名。**
   中文界面使用 `用量接入`、`服务凭据治理`、`治理配置`、`诊断/预检`、`交接包预览` 等管理台文案；`Insight provider trust`、`Usage identity resolver`、`Gateway organization projection`、`Keep in env/config` 作为专有治理项名称保留英文，避免误译造成契约理解偏差。

## Risks / Trade-offs

- [Risk] 用户仍从 `/applications` 找服务凭据治理详细操作。
  Mitigation: 中心页不再渲染服务凭据治理摘要、状态或入口卡片；管理员通过 `应用接入 > 用量接入` 二级导航进入聚焦页。

- [Risk] 没有真实环境时浏览器验证只能覆盖页面渲染、路由和脱敏展示，不能证明 Gateway/Insight 运行态可用。
  Mitigation: 验证记录按证据层级表述，明确本 change 不新增运行态发布或下游 smoke。

- [Risk] 当前 API 返回字段若为空，页面可能无法展示完整治理项。
  Mitigation: 页面必须有空态/不可用态，并保留到应用接入中心、API 映射、Provider 与审计入口的下一步动作。

## Migration Plan

1. 从同步后的 `origin/hfl-test-base` 新建 `hfl-test/add-admin-usage-access-submenu` 工作分支。
2. 先写聚焦测试覆盖新路由、导航 label、服务凭据治理配置、保存、诊断、交接包、加载/错误/空态和脱敏边界。
3. 新增 TSX 页面、抽出的服务凭据治理面板、路由、导航配置、locale 和必要样式，并从中心页移除服务凭据治理摘要/入口卡片。
4. 运行 focused Jest、coverage、`yarn typecheck`、增量 TS 门禁、`yarn build`、`openspec validate`、`git diff --check`。
5. 启动本地预览并用浏览器验证 `/application-usage-access` 桌面与移动视口，无页面级横向溢出、无 webpack overlay、无明显 console error。

Rollback: 删除新增路由、导航叶子、页面、测试、locale key 和本 change OpenSpec artifacts 即可恢复；不涉及数据库、后端契约或运行态数据迁移。

## Open Questions

- 无。第一版范围已限定为 Admin 前端聚焦页和既有脱敏治理契约消费。
