## ADDED Requirements

### Requirement: Current user management scope API
The system SHALL provide an authenticated API that returns the current user's manageable organization scope based on local organization, user, group, and explicit WeCom-sourced relationship tables for user-department, department manager, and direct leader relationships.

#### Scenario: Use module-based current scope endpoint
- **WHEN** a client requests the current user's management scope
- **THEN** the system exposes the current scope through `GET /api/org-management-scope/current`

#### Scenario: Resolve scope organization safely
- **WHEN** the current user's management scope is calculated
- **THEN** the system resolves the target organization from the authenticated user context or an explicitly authorized organization selection and never falls back to another organization's full scope

#### Scenario: Return full scope for administrator
- **WHEN** a global administrator or target organization administrator requests the current management scope
- **THEN** the system returns the full target organization scope including manageable departments and users

#### Scenario: Return department scope for department manager
- **WHEN** a normal user who manages one or more synced WeCom departments requests the current management scope
- **THEN** the system returns those departments, descendant departments, and users in that department subtree

#### Scenario: Return department scope for any listed department manager
- **WHEN** a synced WeCom department has multiple managers and any listed manager requests the current management scope
- **THEN** the system returns that department, descendant departments, and users in that department subtree

#### Scenario: Return subordinate scope for direct leader
- **WHEN** a normal user is the direct leader of one or more synced WeCom users and requests the current management scope
- **THEN** the system returns those direct subordinate users and their recursive subordinate users

#### Scenario: Merge department and subordinate scopes
- **WHEN** a normal user has both department manager scope and direct leader subordinate scope
- **THEN** the system returns a de-duplicated union of manageable departments and visible users

#### Scenario: Return self scope for normal user
- **WHEN** a normal user who does not manage any synced WeCom department and has no synced direct or indirect subordinates requests the current management scope
- **THEN** the system returns only the user's own scope

### Requirement: Scope response identifiers
The system SHALL include stable local and external identifiers in the management scope response so downstream systems can enforce data filters without relying on display names.

#### Scenario: Scope response includes stable identifiers
- **WHEN** the system returns a management scope response
- **THEN** each user entry includes local user ID, local username, WeCom userid when available, and external ID when available

#### Scenario: Department response includes hierarchy identifiers
- **WHEN** the system returns manageable departments
- **THEN** each department entry includes local group ID, local group name, WeCom department ID when available, parent group identity, and display name

#### Scenario: Response includes scope type
- **WHEN** the system returns a management scope response
- **THEN** the response identifies whether the scope came from administrator privileges, department manager relationships, direct leader relationships, self scope, or a combination

#### Scenario: Response includes filter-ready identifiers
- **WHEN** the system returns visible users
- **THEN** the response includes filter-ready user identifiers suitable for downstream joins, including local user identity, WeCom userid when available, and external ID when available

### Requirement: Backend-enforced scope calculation
The system SHALL calculate management scope on the backend and SHALL NOT rely on frontend filtering as the source of authorization.

#### Scenario: Unauthorized scope expansion is rejected
- **WHEN** a normal user requests a scope outside their computed manageable departments
- **THEN** the system does not include unauthorized departments or users in the response

#### Scenario: Department display hierarchy is not treated as direct leader hierarchy
- **WHEN** users appear under the same synced WeCom department in the contact list
- **THEN** the system only treats them as leader and subordinate when the synced direct leader relationship says so

#### Scenario: Disabled synced data is excluded by default
- **WHEN** synced departments or users are marked disabled, deleted, or missing
- **THEN** the system excludes them from the default management scope response unless an administrator explicitly requests diagnostic data

### Requirement: Management scope traversal rules
The system SHALL compute management scope using explicit synced relationships and SHALL guard against duplicate results and relationship cycles.

#### Scenario: Department descendants are included
- **WHEN** a user manages a synced WeCom department
- **THEN** the system includes enabled descendant departments and enabled users in those departments by querying enabled user-department relationships

#### Scenario: Recursive subordinates are included
- **WHEN** a user has synced direct subordinates who also have synced direct subordinates
- **THEN** the system includes enabled direct and indirect subordinate users

#### Scenario: Cycles do not break traversal
- **WHEN** malformed direct leader data creates a cycle
- **THEN** the system de-duplicates visited users and returns a finite scope response without infinite traversal

#### Scenario: Combined scope is de-duplicated
- **WHEN** the same user is visible through both department manager scope and direct leader scope
- **THEN** the system returns that user only once in the visible user list

### Requirement: Downstream report filter contract
The system SHALL expose enough scope filter data for downstream services such as `aicodex-insight` to filter AI usage by permitted users and departments.

#### Scenario: Return filter-ready user identifiers
- **WHEN** a downstream service requests or receives the current user's management scope
- **THEN** the response includes a filter-ready list of permitted user identifiers suitable for joining with downstream usage records

#### Scenario: Empty scope remains explicit
- **WHEN** the current user has no valid local account mapping or no visible scope
- **THEN** the system returns an explicit empty scope rather than falling back to all users
