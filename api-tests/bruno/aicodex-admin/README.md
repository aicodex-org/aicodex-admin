# Bruno aicodex-admin Collection

本目录是 aicodex-admin 的 Bruno 接口 smoke 集合，用于 GUI 手工调试和 `bru` CLI 运行态验证。

## 范围

- `00-健康检查/`：无需登录的服务健康检查。
- `10-认证/`：本地账号登录和当前账号校验。
- `20-基础只读/`：组织、应用等后台基础只读接口。
- `30-WeCom 同步/`：企业微信组织同步配置和 run 查询；手动同步请求默认关闭。
- `40-组织树运营/`：组织树运营诊断和只读刷新状态 smoke；不触发 read model 重建。
- `environments/`：本地和远端占位环境，真实账号、密码和 cookie 不得提交。

## 本机私有环境

如需在 GUI 中保存个人测试凭据，创建：

```text
api-tests/bruno/aicodex-admin/environments/local-private.yml
```

`*-private.yml` 已被 `.gitignore` 忽略。提交前可用下面命令确认没有误写真实凭据：

```powershell
git diff -- api-tests/bruno/aicodex-admin/environments
```

## 远端测试私有环境

`remote-test.yml` 用于远端测试环境，包含真实地址、账号或 cookie 时按本机私有配置处理，不提交到 Git：

```text
api-tests/bruno/aicodex-admin/environments/remote-test.yml
```

仓库只提供 Bruno collection 和无密环境模板；个人或 CI 的远端测试配置需要在各自环境中维护。多工作区共享、hardlink、备份和冲突处理属于本机运维配置，不是仓库前提；如果本机另有私有同步工具，按该工具自己的 README 操作。

如需团队共享变量名或调用方式，只提交无密模板、README 字段说明或 Bruno 请求本身，不提交真实 `remote-test.yml`。

## CLI 示例

```powershell
cd <你的本地仓库路径>/api-tests/bruno/aicodex-admin
bru run "00-健康检查" -r --env local
bru run "10-认证/登录.yml" "10-认证/当前账号.yml" --env local-private
bru run "10-认证/登录.yml" "20-基础只读/组织列表.yml" "20-基础只读/应用列表.yml" --env local-private
bru run "10-认证/登录.yml" "30-WeCom 同步/同步配置.yml" "30-WeCom 同步/同步 runs.yml" --env local-private
bru run "10-认证/登录.yml" "40-组织树运营/诊断.yml" "40-组织树运营/刷新状态.yml" --env local-private
```

WeCom 同步读接口需要 `wecomOrganization`。`30-WeCom 同步/手动触发同步.yml` 会创建后台同步 run，必须显式设置 `wecomSyncWriteEnabled=true` 才能执行。

组织树运营 smoke 优先使用 `organizationTreeOperationsOrganization`，未设置时复用 `wecomOrganization`。如果要把“非空组织树能力”作为通过条件，还需要设置 `organizationTreeOperationsRequireNonEmpty=true`，并使用已知具备可管理组织树的测试账号或受控 fixture。

`40-组织树运营/重建read-model.yml` 会触发受控 read model 刷新路径，默认被脚本阻断。只有在明确的测试窗口、已确认测试账号/fixture、并接受可能创建来源同步 run 时，才在私有环境设置：

```text
organizationTreeOperationsRebuildEnabled=true
```

验证记录只能写入脱敏结果摘要，例如 health 通过、诊断字段存在、节点非空、`refresh_status` 返回 `traceId`、`refresh_read_model` 返回 `accepted/running/unavailable/error` 等；不得记录真实地址、token、Cookie、账号、手机号、邮箱、完整组织结构或完整响应体。
