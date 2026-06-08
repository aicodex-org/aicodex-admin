## ADDED Requirements

### Requirement: WeCom sync run monitoring UI
The system SHALL provide a self-describing sync run monitoring view in the WeCom organization sync admin page so administrators can understand run statistics directly from the table and continue observing active runs without refreshing the whole page.

#### Scenario: Show self-describing department and user statistics
- **WHEN** the admin page renders sync run records
- **THEN** the department and user statistic columns MUST expose the meaning of `created`, `updated`, and `disabled` counts in the table header or cell content itself
- **AND** an administrator MUST be able to understand each statistic row without relying on a detached legend outside the table

#### Scenario: Auto refresh while a run is active
- **WHEN** the current organization's sync record list contains at least one run whose status is `running`
- **THEN** the admin page MUST automatically refresh the sync record list at a bounded interval
- **AND** the page MUST stop automatic refresh after all visible runs enter terminal states such as `succeeded`, `failed`, or `partial`

#### Scenario: Show refresh observation status in page
- **WHEN** the admin page has loaded the sync record section
- **THEN** the page MUST show whether it is currently auto refreshing because of a `running` record or waiting for manual refresh
- **AND** the page MUST expose the latest successful sync record refresh time in the page itself instead of relying only on transient toast messages

#### Scenario: Keep the first screen visible while config is still loading
- **WHEN** the account organization or sync config has not finished resolving yet
- **THEN** the page MUST render a visible in-page loading state instead of a blank screen
- **AND** the loading state MUST keep the admin page context recognizable

#### Scenario: Provide manual refresh action
- **WHEN** an administrator is viewing the sync record section
- **THEN** the page MUST provide an explicit manual refresh action near the sync record area
- **AND** triggering that action MUST fetch the latest sync record data for the current organization without requiring a full page reload
- **AND** the refresh action MUST expose an in-progress state while the request is outstanding

#### Scenario: Browse paged sync run history
- **WHEN** the administrator changes the sync record table page or page size
- **THEN** the page MUST request the selected `page/pageSize` from `/api/wecom-org-sync/runs`
- **AND** the table MUST render the returned history records for that selected page instead of keeping the first page frozen
- **AND** the total count shown in pagination MUST stay consistent with the backend response

#### Scenario: Explain historical page viewing mode
- **WHEN** the administrator is browsing page 2 or later of the sync record table
- **THEN** the page MUST present that state as historical browsing rather than the primary live run observation view
- **AND** the page MUST guide the administrator to return to page 1 when they need to observe the latest run status

#### Scenario: Avoid duplicate start actions while a run is already active
- **WHEN** the sync record section already shows at least one `running` run for the current organization
- **THEN** the page MUST NOT continue exposing the manual full sync start action as an immediately clickable operation
- **AND** the start area MUST make the in-progress state recognizable to the administrator

#### Scenario: Treat stale duplicate-start conflicts as refresh guidance
- **WHEN** an administrator attempts to start a manual sync and the backend responds that a sync run is already running
- **THEN** the page MUST show a non-failure hint that an existing sync is in progress
- **AND** the page MUST refresh the sync record list for the current organization so the running state becomes visible in-page
- **AND** the page MUST NOT present this conflict as a brand new sync failure

#### Scenario: Clear refresh loop on page context change
- **WHEN** the administrator leaves the page or switches to another organization
- **THEN** the page MUST stop any existing automatic refresh loop for the previous page context
- **AND** it MUST NOT continue updating the previous organization view after the context has changed
