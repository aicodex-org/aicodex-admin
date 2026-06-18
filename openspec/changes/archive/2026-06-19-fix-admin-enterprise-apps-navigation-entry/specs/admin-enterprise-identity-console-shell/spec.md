## ADDED Requirements

### Requirement: 旧应用门户入口不得伪装为企业应用列表
Admin 企业认证中心 Shell SHALL distinguish the legacy `/apps` application portal from the `/applications` application access center. Local admin enterprise navigation SHALL NOT render `/apps` as the primary application list entry, and `/applications` SHALL remain the administrator-facing application access center under the application access business domain.

#### Scenario: Local admin 主导航隐藏旧应用门户
- **WHEN** local admin 打开企业认证中心桌面侧栏或移动端抽屉
- **THEN** “中心总览”分组 SHALL NOT include a `/apps` leaf entry
- **AND** “应用接入”分组 SHALL include `/applications` as the application access center entry

#### Scenario: 配置树不把旧门户当作应用列表
- **WHEN** 管理员查看组织导航配置树
- **THEN** 配置树 SHALL NOT present `/apps` as “应用列表” or equivalent application-list wording
- **AND** `/applications` SHALL remain configurable as the application access center route key

#### Scenario: 非 local admin 旧应用门户 fallback 保持兼容
- **WHEN** a non-local-admin user is redirected from the enterprise identity overview fallback or directly visits `/apps`
- **THEN** the legacy application portal route SHALL remain reachable
- **AND** any visible navigation label for `/apps` SHALL describe it as an application portal or application entry, not the administrator application list
