## 1. OpenSpec 与范围确认

- [x] 1.1 创建 `add-dingtalk-organization-sync` change，并补齐 proposal、design、spec deltas
- [x] 1.2 运行 `openspec validate add-dingtalk-organization-sync --strict`

## 2. 后端测试先行

- [x] 2.1 添加钉钉通讯录客户端测试，覆盖 access token、部门分页、成员分页/详情、错误脱敏和连接测试
- [x] 2.2 添加钉钉配置服务和统一来源守卫测试，覆盖 secret 保留、built-in 拒绝、WeCom/Feishu/DingTalk 互斥
- [x] 2.3 添加钉钉同步服务测试，覆盖运行锁、stale run 恢复、快照应用、软禁用和关系落库
- [x] 2.4 添加钉钉调度执行器和控制器测试，覆盖缺失/禁用配置、重复运行、source conflict 和基础 API 响应

## 3. 后端实现

- [x] 3.1 新增钉钉同步模型、常量、脱敏/标识工具和 Xorm 表注册
- [x] 3.2 实现钉钉通讯录客户端，将官方 API 响应规范化为同步快照
- [x] 3.3 实现钉钉配置服务、运行记录仓储、同步服务、调度执行器和 source status 接入
- [x] 3.4 实现钉钉控制器、路由、API 权限白名单和安全错误响应

## 4. 前端测试先行

- [x] 4.1 添加钉钉 backend 请求封装测试，覆盖 `/api/dingtalk-org-sync/...` 路径和 source status payload
- [x] 4.2 添加组织同步通用类型测试，覆盖 `dingtalk` provider logo/alt
- [x] 4.3 添加钉钉页面聚焦测试，覆盖页面渲染、配置保存、连接测试、同步、冲突禁用和空同步记录

## 5. 前端实现

- [x] 5.1 新增 `DingTalkOrganizationSyncBackend.ts` 类型与请求封装
- [x] 5.2 新增 `DingTalkOrganizationSyncPage.tsx`，复用统一同步页 shell 和 AntD 状态组件
- [x] 5.3 接入 ManagementPage/App/enterpriseNavigation/API 白名单和 zh/en 菜单文案

## 6. 验证与收口

- [x] 6.1 运行后端聚焦 `go test` 覆盖钉钉同步和统一来源守卫
- [x] 6.2 运行前端 focused Jest、`yarn typecheck` 和增量 TypeScript gate
- [x] 6.3 运行 `openspec validate add-dingtalk-organization-sync --strict`、`git diff --check`，并记录剩余风险
