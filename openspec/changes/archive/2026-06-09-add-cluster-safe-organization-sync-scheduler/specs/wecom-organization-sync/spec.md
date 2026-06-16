## ADDED Requirements

### Requirement: WeCom scheduled full differential organization sync
The system SHALL allow an authorized administrator to configure scheduled full differential WeCom organization sync for a target organization, using the generic organization sync scheduler.

#### Scenario: Configure scheduled sync
- **WHEN** an authorized administrator saves WeCom organization sync configuration with scheduled sync enabled, cron expression, and timezone
- **THEN** the system MUST persist those scheduling settings through the generic organization sync schedule model
- **AND** subsequent configuration reads MUST return the saved schedule settings with sensitive WeCom secrets masked
- **AND** the scheduling settings MUST NOT be persisted as WeCom-specific configuration table columns

#### Scenario: Scheduled run uses scheduled trigger type
- **WHEN** the generic organization sync scheduler dispatches a WeCom full sync
- **THEN** the created WeCom organization sync run MUST use `triggerType=scheduled`
- **AND** the actor MUST identify the scheduler rather than a human administrator

#### Scenario: Manual run remains manual
- **WHEN** an administrator starts a WeCom organization sync through `/api/wecom-org-sync/runs`
- **THEN** the created run MUST continue to use `triggerType=manual`
- **AND** existing duplicate-running and stale-running behavior MUST remain unchanged

#### Scenario: Scheduled sync respects existing run lease
- **WHEN** a scheduled WeCom sync is due while another WeCom sync run is still active for the same target organization
- **THEN** the scheduler MUST NOT create a duplicate WeCom run
- **AND** the skipped schedule fire MUST guide administrators to the existing running run record

#### Scenario: Scheduled sync disabled by default
- **WHEN** a WeCom organization sync configuration exists but scheduled sync has not been explicitly enabled
- **THEN** no scheduled WeCom sync run MUST be dispatched

### Requirement: WeCom scheduled sync admin visibility
The system SHALL expose scheduled sync settings and recent dispatch metadata in the WeCom organization sync administration experience.

#### Scenario: Show schedule settings in admin page
- **WHEN** an administrator opens the WeCom organization sync page
- **THEN** the page MUST show whether scheduled sync is enabled, the cron expression, and the timezone

#### Scenario: Save schedule settings from admin page
- **WHEN** an administrator changes scheduled sync settings and saves the WeCom sync configuration
- **THEN** the page MUST send those settings to the backend
- **AND** the backend response MUST reflect the persisted schedule state

#### Scenario: Show scheduled trigger in run history
- **WHEN** the sync run history contains a scheduled run
- **THEN** the run history MUST allow an administrator to distinguish scheduled runs from manual runs

## MODIFIED Requirements

### Requirement: Future incremental sync compatibility
The system SHALL keep the data model compatible with future WeCom contact callback incremental sync while supporting manual and scheduled full differential sync.

#### Scenario: Scheduled full sync is supported
- **WHEN** scheduled sync is explicitly enabled for a valid WeCom organization sync configuration
- **THEN** the system MUST run full differential sync through the generic organization sync scheduler
- **AND** scheduled execution MUST preserve the same differential update, run audit, running-lock, and missing-data soft-disable semantics as manual full sync

#### Scenario: Callback incremental sync remains an extension
- **WHEN** WeCom contact callback events are not configured
- **THEN** the system remains correct through manual or scheduled full differential sync and does not require callback incremental processing to satisfy this change
