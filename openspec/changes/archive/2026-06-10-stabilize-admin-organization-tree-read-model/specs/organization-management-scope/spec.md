## MODIFIED Requirements

### Requirement: Current user management scope API
The system SHALL provide an authenticated API that returns the current user's manageable organization scope based on local organization, platform organization master data, lifecycle state, and explicit source-derived relationship records for user-department, department manager, and direct leader relationships.

#### Scenario: Use module-based current scope endpoint
- **WHEN** a client requests the current user's management scope
- **THEN** the system exposes the current scope through `GET /api/org-management-scope/current`

#### Scenario: Resolve scope organization safely
- **WHEN** the current user's management scope is calculated
- **THEN** the system resolves the target organization from the authenticated user context or an explicitly authorized organization selection and never falls back to another organization's full scope
- **AND** the system uses platform organization identity rather than source tenant ID as the authorization boundary

#### Scenario: Return full scope for administrator
- **WHEN** a global administrator or target organization administrator requests the current management scope
- **THEN** the system returns the full target organization scope including manageable departments and users
- **AND** the response includes `scopeVersion` or `orgVersion` and freshness metadata

#### Scenario: Return department scope for department manager
- **WHEN** a normal user who manages one or more enabled platform departments requests the current management scope
- **THEN** the system returns those departments, descendant departments, and users in that department subtree

#### Scenario: Return department scope for any listed department manager
- **WHEN** a platform department has multiple source-confirmed managers and any listed manager requests the current management scope
- **THEN** the system returns that department, descendant departments, and users in that department subtree

#### Scenario: Return subordinate scope for direct leader
- **WHEN** a normal user is the direct leader of one or more enabled platform users and requests the current management scope
- **THEN** the system returns those direct subordinate users and their recursive subordinate users

#### Scenario: Merge department and subordinate scopes
- **WHEN** a normal user has both department manager scope and direct leader subordinate scope
- **THEN** the system returns a de-duplicated union of manageable departments and visible users

#### Scenario: Return self scope for normal user
- **WHEN** a normal user who does not manage any enabled department and has no direct or indirect subordinates requests the current management scope
- **THEN** the system returns only the user's own scope

#### Scenario: Organization tree uses the same backend scope calculation
- **WHEN** organization-tree provider computes visible nodes for Insight or downstream diagnostics
- **THEN** the system uses the same backend-managed platform organization scope rules
- **AND** the result SHALL NOT rely on frontend filtering, display names, phone numbers, emails, source tenant IDs, or management page JSON as authorization facts
- **AND** the provider SHALL reuse or extract the same platform organization scope calculation used by the management scope service instead of maintaining an independent legacy `Group.Manager` authorization path

#### Scenario: Direct leader scope does not imply department subtree
- **WHEN** a user only has direct leader scope over subordinate users
- **THEN** organization-tree provider SHALL NOT convert that relationship into full department subtree visibility
- **AND** any display nodes returned for subordinate users SHALL be limited to confirmed enabled departments that contain those users and SHALL NOT include ancestor, sibling, or descendant expansion unless separately authorized by department manager scope

### Requirement: Scope response identifiers
The system SHALL include stable local, platform, and source metadata identifiers in the management scope response so downstream systems can enforce data filters without relying on display names.

#### Scenario: Scope response includes stable identifiers
- **WHEN** the system returns a management scope response
- **THEN** each user entry includes local user ID, local username, stable admin subject, ExternalIdentity metadata when available, and mappingStatus

#### Scenario: Department response includes hierarchy identifiers
- **WHEN** the system returns manageable departments
- **THEN** each department entry includes local group ID, local group name, platform department ID, parent department identity, display name, source metadata when available, and lifecycle status

#### Scenario: Organization tree response includes filter-ready hierarchy identifiers
- **WHEN** organization-tree provider returns visible departments
- **THEN** each node includes stable platform department identity, parent platform department identity, display path, source metadata, lifecycle status, optional visibility source and version/freshness context
- **AND** consumers SHALL use stable identifiers rather than display names for filters or joins

#### Scenario: Response includes scope type
- **WHEN** the system returns a management scope response
- **THEN** the response identifies whether the scope came from administrator privileges, department manager relationships, direct leader relationships, self scope, custom users, or a combination

#### Scenario: Response includes filter-ready identifiers
- **WHEN** the system returns visible users
- **THEN** the response includes filter-ready user identifiers suitable for downstream joins, including stable admin subject and approved external identity metadata
