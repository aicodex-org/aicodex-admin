## 1. 前端路由修复

- [x] 1.1 修改后台未登录保护路由，固定重定向到 `/login`
- [x] 1.2 保留 `/login/:owner`、OAuth、SAML、CAS 等显式登录入口现有行为

## 2. 验证

- [x] 2.1 补充或运行相关前端测试，覆盖 `lastLoginOrg` 不影响后台入口
- [x] 2.2 运行 OpenSpec 严格校验
