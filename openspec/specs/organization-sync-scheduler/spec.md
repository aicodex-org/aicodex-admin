# organization-sync-scheduler Specification

## Purpose
TBD - created by archiving change add-cluster-safe-organization-sync-scheduler. Update Purpose after archive.
## Requirements
### Requirement: Organization sync schedule configuration
The system SHALL persist organization sync schedules by target organization, provider, and job type, with cron expression, timezone, enablement, and latest dispatch metadata.

#### Scenario: Save disabled schedule by default
- **WHEN** a provider integration has no explicit schedule settings
- **THEN** the system MUST treat scheduled execution as disabled
- **AND** no organization sync run is dispatched by the scheduler

#### Scenario: Validate cron and timezone
- **WHEN** an administrator saves a schedule with an invalid cron expression or unknown timezone
- **THEN** the system MUST reject the schedule with a validation error

#### Scenario: Persist provider-neutral schedule identity
- **WHEN** a schedule is saved for a provider and organization
- **THEN** the system MUST persist a stable identity including `provider`, `jobType`, and `organization`
- **AND** future providers such as DingTalk or Feishu MUST be able to reuse the same schedule model without WeCom-specific columns

### Requirement: Cluster-safe schedule fire acquisition
The system SHALL use persistent schedule fire records and lock leases to guarantee that one schedule window has at most one effective dispatcher at a time across multiple admin nodes.

#### Scenario: Deduplicate same schedule window
- **WHEN** two or more admin nodes evaluate the same due schedule and window at the same time
- **THEN** only one node MUST hold the active schedule fire lock for that window
- **AND** all other nodes MUST skip dispatching while that fire lock is valid

#### Scenario: Recover stale acquired fire
- **WHEN** a node acquired a schedule fire but did not complete dispatch before the fire lock expired
- **THEN** another node MUST be able to acquire that same fire record
- **AND** provider execution locks MUST still prevent duplicate actual organization sync runs

#### Scenario: Record dispatch outcome
- **WHEN** a node acquires a schedule fire
- **THEN** the system MUST record the schedule identity, window start time, dispatching node, lock timestamps, dispatch status, run identity when available, attempt count, and safe error summary when dispatch fails or is skipped

#### Scenario: Do not bypass provider execution lock
- **WHEN** a schedule fire is acquired but the provider reports that a sync run is already running for the organization
- **THEN** the scheduler MUST NOT create another run
- **AND** the fire MUST be recorded as skipped or equivalent non-dispatched state with a safe reason

### Requirement: Provider executor dispatch
The system SHALL dispatch acquired schedule fires through provider executors registered by provider and job type.

#### Scenario: Dispatch registered executor
- **WHEN** a due schedule has a registered executor for its provider and job type
- **THEN** the scheduler MUST call that executor with schedule identity, window start time, and scheduler actor metadata

#### Scenario: Handle missing executor safely
- **WHEN** a due schedule has no registered executor
- **THEN** the scheduler MUST mark the fire as failed with a safe configuration error
- **AND** it MUST NOT panic the admin process

#### Scenario: Keep local tick separate from cluster safety
- **WHEN** every admin node runs a local scheduler tick
- **THEN** local ticks MAY evaluate the same schedule independently
- **AND** cluster safety MUST still be enforced by persistent fire acquisition rather than in-memory locks

### Requirement: Scheduler startup and observability
The system SHALL start the organization sync scheduler after database initialization and expose enough persisted metadata for operational diagnosis.

#### Scenario: Start after table initialization
- **WHEN** the admin service starts
- **THEN** organization sync schedule tables MUST be initialized before the scheduler begins scanning schedules

#### Scenario: Continue after one schedule failure
- **WHEN** one due schedule fails validation, acquisition, or executor dispatch
- **THEN** the scheduler MUST record the failure for that schedule
- **AND** it MUST continue evaluating other schedules

#### Scenario: Keep sensitive values out of scheduler records
- **WHEN** a schedule fire fails because of provider configuration or execution setup
- **THEN** persisted scheduler error text MUST NOT include provider secrets, tokens, or credentials
