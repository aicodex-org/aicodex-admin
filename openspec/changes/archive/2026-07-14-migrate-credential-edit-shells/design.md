## Context

`CertEditPage.tsx` 与 `KeyEditPage.tsx` 已使用 `admin-access-edit-*` 兼容样式，但页面仍由带操作标题的 Card 和正文末尾第二组按钮组成。列表页点击添加会立即调用 add API，随后编辑页在取消时删除临时对象；这会产生未完成记录和额外写入，也与已迁移 Syncer 的保存时创建语义不一致。

证书页同时包含基础配置、类型条件、生成参数、SSL 云账号参数以及两个大文本材料区；密钥页只有十个左右字段。两页都涉及敏感凭据，前端只负责编辑和显示后端返回值，后端仍是生成结果和持久化事实的 owner。

## Goals / Non-Goals

**Goals:**

- 让证书和密钥编辑页复用 `LargeEditShell` 的头部、滚动正文和固定底部动作栏。
- 证书使用两个 tabs 降低长页滚动，密钥保持单正文双分区，避免空 tabs。
- 将新增统一为本地草稿，只有保存时才创建；取消和返回不产生后端写入。
- 添加态保存成功并停留页面时回读后端记录，展示生成的证书、私钥或访问凭据。
- 复用公共正文、分类标题、字段 label、按钮和响应式样式，仅保留必要页面私有布局。

**Non-Goals:**

- 不修改后端 API、payload、凭据生成算法、加密算法选项、数据库结构或权限模型。
- 不改变列表显式删除、证书域名刷新、复制、下载及编辑态保存语义。
- 不把证书与密钥字段抽成共享业务组件，不为后续 Webhook、Token 等页面预建新框架。
- 不在本次新增脏状态确认、自动保存、草稿持久化或离开恢复机制。
- 不在浏览器验收中执行真实保存、生成、删除、刷新或其它凭据写操作。

## Decisions

1. **两页共用壳，正文按复杂度区分。**
   证书页通过 `LargeEditTabs` 呈现“基础配置”和“证书材料”，tab key 写入 URL hash；密钥页不传 tabs 插槽，正文使用“基础信息”和“凭据与状态”两个公共分类标题。相比两页都强制 tabs，此方案保持信息密度，也符合组织/用户/应用与群组/角色形成的既有边界。

2. **新增草稿通过内存路由状态传递。**
   `CertListPage.newCert()` 与 `KeyListPage.newKey()` 继续生成相同默认对象，但 `addCert()` / `addKey()` 只执行 `history.push`，将 mode 和 draft 传给编辑页。草稿不进入 URL、localStorage、日志或 OpenSpec 验证材料。页面刷新不会保留未保存草稿，这是避免敏感草稿持久化的明确取舍。

3. **添加态保存调用 add API，编辑态保持 update API。**
   编辑页根据 mode 选择 `addCert` / `addKey` 或既有 `updateCert` / `updateKey`。添加成功后更新路由标识并切换为 edit；若用户点击普通保存，则导航到正式编辑 URL 并调用 `getCert` / `getKey` 回读后端生成值；保存并返回则直接回列表。

4. **取消和返回只负责导航。**
   由于添加态尚未写入后端，壳顶部返回和底部取消都直接返回 `/certs` 或 `/keys`，不再调用编辑页 `deleteCert` / `deleteKey`。列表中的显式删除接口不变。

5. **保存期间阻止重复提交。**
   两页增加局部 submitting 状态，保存请求期间禁用取消以外的重复保存动作并为主保存按钮显示 loading。请求失败后恢复状态，并保留后端错误信息；添加失败不切换 edit mode，编辑失败继续回滚名称/owner 等既有路由标识字段。

6. **敏感值只沿既有界面边界展示。**
   本 change 不增加新的凭据摘要、日志或截图内容。证书材料 tab 和密钥凭据区只显示当前 API 已返回的字段；浏览器验证使用现有只读记录，不复制或记录完整敏感值。

7. **样式复用公共原子，页面特例集中维护。**
   页面保留 `admin-access-edit-*`、`cert-edit-*`、`key-edit-*` selector，并补充 `admin-large-edit-*` 公共正文 class。证书材料编辑器高度、按钮行和密钥区宽度放入一个按凭据页面族命名的 scoped LESS 模块，由 `large-edit-pages.less` 聚合，不回写 `App.less`。

## Risks / Trade-offs

- [Risk] 添加页刷新后内存草稿丢失。→ 不持久化敏感草稿；刷新进入不存在记录时沿用既有 404 行为，用户可返回列表重新添加。
- [Risk] add API 生成的材料在提交响应中不可用。→ 普通保存成功后调用既有 get API 回读；保存并返回由列表下次查询展示记录。
- [Risk] 证书不同类型字段高度差异明显。→ 基础配置 tab 保留现有条件与 handler，材料 tab 只承载证书和私钥，不改变类型切换清理逻辑。
- [Risk] 证书、私钥和 Access secret 可能进入测试输出。→ 单测使用脱敏 fixture，浏览器只验证结构与可见性，不输出 DOM 文本、网络响应体或截图中的完整敏感值。
- [Risk] 两页同时迁移扩大回归面。→ 按列表新增语义、证书页、密钥页三个聚焦测试组分步 TDD，并对最终改动计算 changed implementation coverage。

## Migration Plan

1. 完成 OpenSpec artifacts 与实施前 review。
2. 先补失败测试，约束添加不写后端、保存时创建、取消不删除、生成结果回读和共享壳结构。
3. 修改两个列表新增入口，再分别迁移证书与密钥编辑页及 scoped 样式。
4. 运行聚焦测试、changed implementation coverage、TypeScript gate、typecheck、lint 和 build。
5. 启动本地前端代理 60 测试后台，只读验证证书双 tabs、密钥单正文、暗色、窄屏、overflow 和控制台。
6. 若需回滚，恢复四个页面和样式入口即可；后端与数据无需迁移。

## Open Questions

- 无。
