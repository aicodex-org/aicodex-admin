## ADDED Requirements

### Requirement: 工作区标签必须过滤无效路由并保持顺序稳定

Admin 身份控制台 Shell SHALL use current enterprise navigation route metadata as the workspace tab allowlist, and SHALL keep tab order stable after hydration, navigation, repeated opens and close actions.

#### Scenario: 恢复历史标签时过滤无效路由

- **WHEN** session storage contains `/404`, empty paths, unknown paths, old shortcut paths or routes that are no longer visible in the current enterprise navigation
- **THEN** workspace tabs SHALL discard those paths before rendering or saving tabs
- **AND** `/404` SHALL NOT appear as a workspace tab
- **AND** if all restored non-default paths are invalid, Shell SHALL fall back to the fixed overview tab plus the current valid route when one exists

#### Scenario: 未知 URL 不进入工作区标签

- **WHEN** a user directly visits an unknown URL and the router renders the 404 page
- **THEN** Shell MAY show the 404 page through the normal router fallback
- **AND** Shell MUST NOT create, persist or display a workspace tab for that unknown URL or `/404`

#### Scenario: 激活已有标签不改变打开顺序

- **WHEN** a user clicks an existing workspace tab or opens a route that already has a tab
- **THEN** Shell SHALL only activate or navigate to that route
- **AND** the tab order SHALL remain the original open order
- **AND** the fixed overview tab SHALL remain first

#### Scenario: 关闭当前标签按稳定相邻规则切换

- **WHEN** a user closes the active non-fixed workspace tab
- **THEN** Shell SHALL navigate to the nearest right-side remaining tab when it exists
- **AND** Shell SHALL navigate to the nearest left-side remaining tab when no right-side tab exists
- **AND** Shell SHALL navigate to the fixed overview tab when no other non-fixed tab remains

#### Scenario: 标签栏视觉和可访问性稳定

- **WHEN** desktop workspace tabs render with active, hover, focus-visible and close-button states
- **THEN** active tabs SHALL be visually clearer than inactive tabs while preserving stable height and gutter
- **AND** inactive tabs SHALL remain quiet and scan-friendly
- **AND** long titles SHALL truncate within the tab instead of expanding the page
- **AND** close buttons SHALL have accessible labels and visible hover/focus states
