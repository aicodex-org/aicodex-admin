## ADDED Requirements

### Requirement: Gateway projection readiness summary MUST guide operator handoff
Admin SHALL provide a read-only gateway projection readiness summary for operators so they can identify deployment shape, source freshness, mapping readiness and publishable subject prerequisites without writing fixtures, querying API/Insight databases, or creating gateway authorization facts.

#### Scenario: Summary combines observability and mapping readiness safely
- **WHEN** operator evaluates gateway projection readiness with an Admin observability response and optional `PlatformApiUserMapping` readiness response
- **THEN** the summary SHALL return a top-level `status`, stable alias list, sanitized counts, owner handoff guidance and minimum unblock conditions
- **AND** the summary SHALL include source freshness, mapping readiness, publishable subject prerequisites and deployment package prerequisites when those inputs are available
- **AND** the summary SHALL NOT print token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef or raw gateway response body

#### Scenario: Summary blocks stale deployment shape
- **WHEN** observability preflight reports missing latest audit while required, missing `sourceConnectionSummary`, missing freshness counts or missing freshness boolean signals
- **THEN** the summary SHALL return `status=blocked`
- **AND** the summary SHALL expose alias `environment_deploy_stale`
- **AND** owner handoff SHALL direct the operator to the Admin deploy/runtime owner with a minimum unblock condition requiring a package that returns the current observability shape
- **AND** the summary SHALL NOT describe the projection business path as complete

#### Scenario: Summary distinguishes mapping readiness from deployment readiness
- **WHEN** mapping readiness counts include `mapping_missing` or `mapping_untrusted`
- **THEN** the summary SHALL expose the corresponding mapping alias and remediation owner as Admin mapping operator
- **AND** guidance SHALL require same `organizationId + adminSubject` first-class `PlatformApiUserMapping.ApiUserId` and trusted mapping statuses
- **AND** guidance SHALL NOT suggest display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Summary distinguishes source freshness and fixture prerequisites
- **WHEN** source freshness diagnostics are stale, unavailable or unknown
- **THEN** the summary SHALL expose Admin source/freshness owner handoff rather than asking API/Insight owners to compute projection locally
- **WHEN** subject count gates are enabled and latest publish audit has fewer subjects than required
- **THEN** the summary SHALL expose alias `no_publishable_subjects`
- **AND** guidance SHALL state that controlled fixture readiness is missing, not that deployment shape is stale

#### Scenario: Summary records not-checked inputs explicitly
- **WHEN** operator does not provide an organization alias or mapping readiness response
- **THEN** the summary SHALL mark mapping readiness as `not_checked`
- **AND** the summary SHALL provide the safe next read-only action for checking `/api/get-platform-api-user-mapping-readiness`
- **AND** the summary SHALL NOT query real databases, write fixture data or infer mapping readiness from display metadata
