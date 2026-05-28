# 企业微信组织同步联调记录

本文记录 `aicodex-admin` 企业微信组织架构同步的测试结果、排障结论和脱敏请求/响应样例。所有 Secret、数据库密码、登录凭证和完整敏感响应均不写入本文。

## 1. 测试环境

| 项目 | 值 |
| --- | --- |
| 环境 | aicodex-admin 测试环境 |
| 服务地址 | `http://10.18.80.69:8000` |
| 部署分支 | `hfl-test/feat-wecom-organization-sync` |
| 记录对应提交 | `991b871d`（历史远端联调记录，后续部署以远端 `git rev-parse --short HEAD` 为准） |
| 部署时间 | `2026-05-22 14:45:59` 至 `2026-05-22 14:47:46` |
| 镜像创建时间 | `2026-05-22T14:47:29.619716262+08:00` |
| 容器 | `admin-aicodex-admin-1` |
| Compose project | `admin` |
| 健康检查 | `http://127.0.0.1:8000/` 返回 `200` |
| 企业微信出口 IP | `110.53.201.122` |

远端部署命令：

```bash
cd ~/app/aicodex-admin
./deploy-aicodex-admin.sh --branch hfl-test/feat-wecom-organization-sync up
```

## 2. 已完成的本地验证

OpenSpec 校验：

```powershell
openspec validate add-wecom-organization-sync --strict
```

后端聚焦测试：

```powershell
go test -v -count=1 -timeout 300s ./object -run "Test(Wecom|OrganizationManagement|EnsurePostgresDataSourceNameUsesUTCTimeZone|RefineDataSourceNameForPostgresPreservesFollowingOptions)"
go test -v -count=1 -timeout 120s ./controllers ./routers -run "Test(ResolveWecomOrganizationSyncTarget|IsWecomOrganizationSyncAdmin|GetWecomOrganizationSyncObject|GetOrganizationManagementScopeObject|ResolveModuleOrganizationQuery)"
```

前端相关测试：

```powershell
corepack yarn test --runTestsByPath src\Setting.test.js src\backend\WecomOrganizationSyncBackend.test.js src\WecomOrganizationSyncPage.test.js --watchAll=false --runInBand
```

空白和格式检查：

```powershell
git diff --check
```

验证结论：

- OpenSpec 严格校验通过。
- 企业微信通讯录客户端、同步服务、管理范围、接口路由相关测试通过。
- 前端企业微信同步页、请求封装和时间展示相关测试通过。
- `timestamptz` 读取默认使用 PostgreSQL `timezone=UTC`，避免同步记录时间和运行锁时间偏移。
- 运行中记录的零值结束时间前端显示为 `-`，不再显示 `0001-01-01`。
- 当 `user/list_id` 返回 `48002` 时，后端已支持回退到 `user/list`。
- 手动启动同步接口返回 `running` 后，后端会在后台继续执行全量差异同步，并通过同步记录写回最终状态。

## 3. 后台基础验收结果

以下验收不依赖企业微信真实成功同步：

| 项目 | 结果 | 说明 |
| --- | --- | --- |
| 菜单入口 | 通过 | 左侧菜单存在“企业微信同步”。 |
| 页面标题 | 通过 | 页面标题为“企业微信组织架构同步”。 |
| 配置保存 | 通过 | `POST /api/wecom-org-sync/config` 返回成功。 |
| Secret 脱敏 | 通过 | 保存后页面和接口返回 `***`，不回显明文 Secret。 |
| 未启用时同步限制 | 通过 | 未启用配置时发起同步返回 `wecom organization sync config is disabled`。 |
| 同步记录列表 | 通过 | `GET /api/wecom-org-sync/runs` 可返回同步记录和分页数量。 |
| 错误脱敏 | 通过 | 连接测试失败信息未包含 Secret。 |
| 远端健康检查 | 通过 | 部署后 HTTP 健康检查返回 `200`。 |

## 4. 企业微信真实联调过程

### 4.1 Corp ID 填错

现象：

```text
连接测试失败：wecom gettoken failed: errcode=40013, errmsg=invalid corpid, from ip: 110.53.201.122
```

结论：

- 请求已经到达企业微信 `gettoken`。
- 当时填写的 `Corp ID` 实际更像自建应用 `AgentId`。
- `Corp ID` 应填写企业微信管理后台“我的企业/企业信息/企业 ID”中的企业 ID，通常以 `ww...` 开头。

### 4.2 成员 ID 列表接口无权限

现象：

```text
连接测试失败：wecom user/list_id failed: errcode=48002, errmsg=api forbidden, from ip: 110.53.201.122
```

结论：

- `gettoken` 已成功。
- 当前自建应用无权调用 `user/list_id`。
- 已在 `991b871d` 中增加兼容：`user/list_id` 返回 `48002` 时，自动回退到 `user/list?department_id=1&fetch_child=1`。

### 4.3 企业可信 IP 未配置

现象：

```text
连接测试失败：wecom department/list failed: errcode=60020, errmsg=not allow to access from your ip, from ip: 110.53.201.122
```

结论：

- 当前 `Corp ID` 和 Secret 已能进入通讯录 API 调用阶段。
- 企业微信拒绝来自服务端出口 IP `110.53.201.122` 的请求。
- 需要在企业微信自建应用的可信 IP 配置中加入 `110.53.201.122`。
- 该 IP 是服务端出口公网 IP，不是浏览器所在机器的局域网或公网 IP。

### 4.4 真实同步成功与 built-in 清理

现象：

- 企业微信可信 IP 配置修正后，测试连接和全量同步成功。
- 目标业务组织为 `wecom-wwe7e01c69367e67bf`，后台显示名为“联软科技集团”。
- 最新成功同步结果包含 254 个部门、1045 个成员、1059 条成员部门关系、26 条部门负责人关系和 986 条直属上级关系。

结论：

- 企业微信普通成员已同步到 Corp ID 绑定的业务组织，不再写入 `built-in`。
- 历史误同步到 `built-in` 的 `wecom-user-*`、`wecom-dept-*`、同步配置、运行记录、映射表和关系表测试数据已在备份后清理。
- 备份表名前缀为 `backup_builtin_wecom_20260527_142545_*`。
- 后台同步目标组织选择器不再展示 `built-in`，避免继续把系统内置组织当作通讯录同步目标。

### 4.5 头像、手机号和邮箱为空

现象：

- 用户列表中企业微信同步用户的头像显示为空图标。
- 电子邮箱、手机号列为空。

结论：

- 同步代码会把企业微信返回的 `avatar`、`thumb_avatar`、`mobile`、`telephone`、`email`、`biz_mail` 写入本地用户展示字段。
- 当前为空不是前端列表过滤导致，而是企业微信接口未返回这些敏感字段。
- 企业微信官方[“读取成员”文档](https://developer.work.weixin.qq.com/document/path/90196)说明，新创建的自建应用与代开发应用调用 `user/get` 时不再返回头像、手机、邮箱、企业邮箱等字段，需要通过 OAuth2 手工授权获取管理员与员工本人授权字段。
- 当前首版同步仍可满足组织树、成员身份、部门负责人、直属上级和管理范围计算；头像、手机号、邮箱可作为后续增强处理。
- 后续推荐新增“企业微信登录回填用户资料”能力：用户扫码登录后，基于本人 OAuth 授权补齐头像、邮箱和手机号；头像应缓存成本地永久头像，手机号和邮箱如果业务强依赖，优先从 HR、LDAP 或 Excel 等人事主数据源补齐。

## 5. 后台接口样例

以下样例均为脱敏示例。实际调用需要管理员登录态 Cookie，不能在文档中写入真实 Cookie、Secret 或密码。当前同步目标应使用 Corp ID 绑定出的业务组织，不能把企业微信普通成员同步到 `built-in`。

### 5.1 保存企业微信同步配置

请求：

```http
POST /api/wecom-org-sync/config
Content-Type: application/json
Cookie: <admin-session-cookie>
```

```json
{
  "organization": "wecom-wwe7e01c69367e67bf",
  "corpId": "ww***67bf",
  "addressBookSecret": "<secret>",
  "isEnabled": true,
  "softDisableMissingData": false
}
```

成功响应：

```json
{
  "status": "ok",
  "msg": "",
  "data": {
    "organization": "wecom-wwe7e01c69367e67bf",
    "isConfigured": true,
    "config": {
      "owner": "wecom-wwe7e01c69367e67bf",
      "name": "wecom-org-sync-config",
      "organization": "wecom-wwe7e01c69367e67bf",
      "corpId": "ww***67bf",
      "addressBookSecret": "***",
      "isEnabled": true,
      "softDisableMissingData": false
    }
  }
}
```

### 5.2 查询同步配置

请求：

```http
GET /api/wecom-org-sync/config?organization=wecom-wwe7e01c69367e67bf
Cookie: <admin-session-cookie>
```

成功响应：

```json
{
  "status": "ok",
  "data": {
    "organization": "wecom-wwe7e01c69367e67bf",
    "isConfigured": true,
    "config": {
      "organization": "wecom-wwe7e01c69367e67bf",
      "corpId": "ww***67bf",
      "addressBookSecret": "***",
      "isEnabled": true,
      "softDisableMissingData": false
    }
  }
}
```

### 5.3 测试企业微信连接

请求：

```http
POST /api/wecom-org-sync/config/test
Content-Type: application/json
Cookie: <admin-session-cookie>
```

```json
{
  "organization": "wecom-wwe7e01c69367e67bf",
  "corpId": "ww***67bf",
  "addressBookSecret": "<secret>",
  "isEnabled": true,
  "softDisableMissingData": false
}
```

成功响应样例：

```json
{
  "status": "ok",
  "data": {
    "accessTokenOk": true,
    "departmentSnapshotOk": true,
    "userSnapshotOk": true,
    "departmentCount": 12,
    "userCount": 120,
    "departmentLeaderFieldAvailable": true,
    "directLeaderFieldAvailable": true,
    "isLeaderInDepartmentFieldAvailable": true,
    "missingFields": []
  }
}
```

当前测试环境最后一次失败响应样例：

```json
{
  "status": "error",
  "msg": "wecom department/list failed: errcode=60020, errmsg=not allow to access from your ip, hint: [<hint-id>], from ip: 110.53.201.122, more info at https://open.work.weixin.qq.com/devtool/query?e=60020"
}
```

### 5.4 启动全量同步

请求：

```http
POST /api/wecom-org-sync/runs
Content-Type: application/json
Cookie: <admin-session-cookie>
```

```json
{
  "organization": "wecom-wwe7e01c69367e67bf"
}
```

成功响应样例：

```json
{
  "status": "ok",
  "data": {
    "runId": "wecom-sync-run-<timestamp>",
    "run": {
      "owner": "wecom-wwe7e01c69367e67bf",
      "name": "wecom-sync-run-<timestamp>",
      "organization": "wecom-wwe7e01c69367e67bf",
      "triggerType": "manual",
      "actor": "built-in/admin",
      "status": "running",
      "stage": "fetching",
      "startedAt": "2026-05-22T06:47:00Z",
      "leaseExpiresAt": "2026-05-22T07:17:00Z"
    }
  }
}
```

未启用配置时响应样例：

```json
{
  "status": "error",
  "msg": "wecom organization sync config is disabled"
}
```

已有未过期同步运行时响应样例：

```json
{
  "status": "error",
  "msg": "wecom organization sync run is already running"
}
```

### 5.5 查询同步记录

请求：

```http
GET /api/wecom-org-sync/runs?organization=wecom-wwe7e01c69367e67bf&p=1&pageSize=10&field=&value=&sortField=&sortOrder=
Cookie: <admin-session-cookie>
```

响应样例：

```json
{
  "status": "ok",
  "data": [
    {
      "owner": "wecom-wwe7e01c69367e67bf",
      "name": "wecom-sync-run-<timestamp>",
      "organization": "wecom-wwe7e01c69367e67bf",
      "actor": "built-in/admin",
      "status": "running",
      "stage": "fetching",
      "startedAt": "2026-05-21T07:29:05Z",
      "finishedAt": "0001-01-01T00:00:00Z",
      "departmentCreatedCount": 0,
      "departmentUpdatedCount": 0,
      "departmentDisabledCount": 0,
      "userCreatedCount": 0,
      "userUpdatedCount": 0,
      "userDisabledCount": 0,
      "errorText": ""
    }
  ],
  "data2": 1
}
```

前端展示口径：

- `running` 显示为“运行中”。
- `finishedAt = 0001-01-01T00:00:00Z` 显示为 `-`。
- 错误摘要只展示脱敏后的安全文本。

### 5.6 查询当前用户管理范围

请求：

```http
GET /api/org-management-scope/current?organization=wecom-wwe7e01c69367e67bf
Cookie: <admin-session-cookie>
```

响应样例：

```json
{
  "status": "ok",
  "data": {
    "organization": "wecom-wwe7e01c69367e67bf",
    "scopeType": "department-manager",
    "departments": [
      {
        "groupOwner": "wecom-wwe7e01c69367e67bf",
        "groupName": "wecom-dept-wwe7e01c69367e67bf-2",
        "departmentId": "2",
        "parentDepartmentId": "1",
        "displayName": "研发中心"
      }
    ],
    "users": [
      {
        "userOwner": "wecom-wwe7e01c69367e67bf",
        "userName": "zhangsan",
        "wecomUserId": "zhangsan",
        "externalId": "wecom:ww***67bf:zhangsan"
      }
    ],
    "filterUserIds": [
      "wecom:ww***67bf:zhangsan",
      "zhangsan"
    ]
  }
}
```

## 6. 企业微信外部 API 链路

连接测试成功时，后端调用顺序为：

1. `GET /cgi-bin/gettoken`
2. `GET /cgi-bin/department/list`
3. `POST /cgi-bin/user/list_id`
4. `GET /cgi-bin/user/get`

兼容回退链路：

1. `POST /cgi-bin/user/list_id` 返回 `48002`
2. 回退到 `GET /cgi-bin/user/list?department_id=1&fetch_child=1`

当前阻塞点：

```text
GET /cgi-bin/department/list
errcode=60020
from ip=110.53.201.122
```

需要企业微信自建应用侧配置可信 IP 后继续联调。

## 7. 后续待验证

- 企业微信自建应用可信 IP 加入 `110.53.201.122` 后，重新执行“测试连接”。
- 如果连接测试成功，执行一次“开始全量同步”。
- 核对部门、用户、成员部门关系、部门负责人关系和直属上级关系是否写入 7 张企业微信同步表。
- 核对当前用户可管理范围接口是否能按部门负责人和直属上级关系返回正确范围。
- 若 `user/list` 回退后仍返回权限错误，需要继续调整自建应用通讯录读取权限和可见范围。
