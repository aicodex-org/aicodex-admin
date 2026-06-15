## 1. OpenSpec 与方案

- [x] 1.1 创建 `add-feishu-organization-sync` proposal、design、tasks 和 spec delta
- [x] 1.2 完成实施前 review loop，修复 Blocking/Fixable 后运行 `openspec validate add-feishu-organization-sync --strict` 和 `git diff --check`

## 2. 后端模型与配置

- [x] 2.1 新增飞书组织同步配置、run、部门映射、用户映射、用户部门关系模型，并注册 Xorm 建表
- [x] 2.2 实现配置服务：必填校验、endpoint mode 校验、Secret 脱敏回显、masked secret 保留更新、调度字段读写
- [x] 2.3 创建或更新 `SourceConnection`，`sourceType` 使用 `lark` 或 `feishu`，不得混用 `wecom`
- [x] 2.4 实现业务组织派生规则，优先基于 `tenant_key`，P0 取不到时基于 `app_id` 派生并记录 metadata

## 3. 飞书通讯录客户端

- [x] 3.1 实现国内飞书/海外 Lark API base URL 选择，复用现有 Lark Provider endpoint 语义
- [x] 3.2 实现 tenant access token 获取和安全错误映射
- [x] 3.3 实现 Contact v3 部门树、用户和用户部门关系快照拉取与规范化
- [x] 3.4 实现连接测试，验证 token、部门读取和用户读取权限，不写入本地组织数据
- [x] 3.5 为响应规范化、endpoint 选择、错误脱敏和权限失败补充聚焦测试

## 4. 全量差异同步服务

- [x] 4.1 实现运行锁、stale running 恢复、手动 run、scheduled run 和后台执行
- [x] 4.2 实现部门 upsert 到 `Group` 和飞书部门映射表，保留稳定本地部门标识
- [x] 4.3 实现用户 upsert 到 `User` 和飞书用户映射表，使用 `user_id -> User.Lark` 并兼容历史 `open_id` / `union_id`
- [x] 4.4 实现用户部门关系 upsert/disable，并只维护飞书来源用户组，保留非飞书用户组
- [x] 4.5 实现 `PlatformDepartment`、`PlatformUser`、`PlatformMembership`、`ExternalIdentity` 和 `OrgSyncBatch` 投影
- [x] 4.6 实现成功后软禁用缺失数据，失败或 partial 不软禁用
- [x] 4.7 持久化 run 统计、状态、阶段、触发来源和安全错误摘要

## 5. API、路由与权限

- [x] 5.1 新增 Feishu org sync controller，覆盖配置查询/保存、连接测试、启动同步、run 列表和详情
- [x] 5.2 注册 `/api/feishu-org-sync/...` 路由
- [x] 5.3 扩展 authz 模块路径识别和测试，确保飞书同步接口按目标组织管理员权限校验
- [x] 5.4 注册 `lark` 或 `feishu` provider 的组织同步调度执行器

## 6. Web Admin 前端

- [x] 6.1 新增 `FeishuOrganizationSyncBackend` 请求封装
- [x] 6.2 新增 `/feishu-org-sync` 页面，对齐企业微信同步页的信息架构和状态处理
- [x] 6.3 在管理工具菜单和路由中增加飞书组织同步入口
- [x] 6.4 覆盖加载、空配置、Secret 脱敏、连接测试、启动同步、定时设置、run 历史和错误态

## 7. 验证与收尾

- [x] 7.1 运行 OpenSpec 校验：`openspec validate add-feishu-organization-sync --strict`、`openspec validate --specs --strict`、`openspec validate --changes --strict`
- [x] 7.2 运行后端聚焦测试和受影响包 coverage，记录低于 85% 或无法测量的原因
- [x] 7.3 运行前端相关测试或构建检查
- [x] 7.4 运行 `git diff --check`
- [x] 7.5 完成归档前 review；无 Blocking/Fixable 后 archive change 并验证主规格
- [x] 7.6 写入完整 agent report，并给协调线程短回传
