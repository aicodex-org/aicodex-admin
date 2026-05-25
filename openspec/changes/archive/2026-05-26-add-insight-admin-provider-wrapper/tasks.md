## 1. 契约与基础结构

- [x] 1.1 新增 insight admin provider DTO、统一响应 envelope、错误码和字段白名单，覆盖 current-user、scope 和 organization-tree
- [x] 1.2 确认 insight client 的生产鉴权方式，优先支持 admin 用户访问令牌校验，并记录 issuer、audience、expiry、scope 的校验点
- [x] 1.3 增加 provider 专用审计日志 helper，字段至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status` 和 `errorCode`

## 2. current-user provider

- [x] 2.1 新增 `GET /api/admin-provider/insight/v1/current-user` 路由和 handler，解析当前 admin 用户并复用现有用户读取能力
- [x] 2.2 按白名单返回 `adminUserId`、`username`、`displayName`、`organization`、`roles`、`groups`、`usageIdentity` 和 `generatedAt`
- [x] 2.3 裁剪密码、token、密钥、手机号明文、邮箱明文等敏感字段，并补充敏感字段不透出的测试或等效断言

## 3. scope provider

- [x] 3.1 新增 scope 计算服务，按全局管理员、所属 organization 下 `IsAdmin=true` 的组织管理员、分组负责人、自定义用户权限、本人和空范围的顺序计算 scope
- [x] 3.2 实现 `ALL_COMPANY`、`DEPARTMENT_TREE`、`CUSTOM_USERS`、`SELF`、`EMPTY` 的响应映射，确保组织管理员只覆盖所属 organization，空列表不会被误解为全公司范围
- [x] 3.3 实现 admin 用户到 `aicodex-api` 用量用户 ID 的确定性映射，缺失或歧义时返回 `AUTHORIZATION_FAILED` 和 `mappingStatus`，并拒绝猜测 `apiUserIds`
- [x] 3.4 新增 `GET /api/admin-provider/insight/v1/current-user/scope` 路由和 handler，并接入审计日志
- [x] 3.5 为 `DEPARTMENT_TREE` 返回 `departments[]` 部门级映射，包含 `departmentId`、`adminUserIds`、`apiUserIds`、`includeChildDepartments` 和 `mappingStatus`

## 4. organization-tree provider

- [x] 4.1 梳理 `Group.Type`、`ParentId`、`Manager` 与部门树语义，确认是否需要过滤非部门型 group
- [x] 4.2 新增 `GET /api/admin-provider/insight/v1/current-user/organization-tree` 路由和 handler，基于当前用户 scope 返回可见分组/部门树
- [x] 4.3 返回 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren` 和 `sourceType`，并覆盖空树场景

## 5. 权限、测试与文档

- [x] 5.1 补充未登录、token audience 不匹配、无权限、映射缺失、空 scope、正常管理员、组织管理员越界和分组负责人部门映射场景测试
- [x] 5.2 运行 admin 后端相关测试或最小编译验证，记录命令和关键结果
- [x] 5.3 补充 insight 联调用请求/响应样例，不包含真实账号、token、手机号、邮箱或密钥
- [x] 5.4 若实施中发现 scope 规则、映射字段或鉴权方式与设计不一致，回写本 change 的 `design.md` 和 spec
