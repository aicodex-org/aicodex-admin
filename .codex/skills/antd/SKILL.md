---
name: antd
description: Project-custom aicodex-admin Ant Design guidance. Use when working with Ant Design in the web-admin frontend, especially Layout, Menu, Tree, Table, Form, Modal, Tag, Tooltip, loading/empty/error states, AntD warnings, stable keys, admin table density, and enterprise console UI patterns.
---

# Ant Design Admin UI

## Baseline

- This is a project-custom skill for `aicodex-admin`, not a public upstream AntD skill.
- The frontend uses Ant Design 5 with `ConfigProvider` and `@ant-design/cssinjs` configured in `src/App.js`.
- Prefer AntD components and `@ant-design/icons` over custom controls when AntD already provides the interaction.
- Keep the UI quiet, dense, and work-focused. This is an admin console, not a marketing site.
- Reuse local table, navigation, select, and message helpers before creating new component patterns.

## Component Rules

- `Menu`: use the AntD `items` API through `Setting.getItem`; keep `key`, `selectedKeys`, `openKeys`, and matchers stable. When navigation changes, update both desktop `Sider` and mobile `Drawer` behavior through shared menu data.
- `Tree`: provide stable `key` values and `treeData`; keep organization navigation config trees aligned with `buildEnterpriseNavigationConfigTreeData`.
- `Table`: always set a stable `rowKey`; keep pagination compatible with `common/table/TablePagination`; prefer `size="middle"` or existing page density; make long identifiers copyable or truncated with a tooltip when needed.
- `Form`: keep validation messages actionable; disable or show loading on submit buttons during async saves; keep destructive actions behind clear confirmation.
- `Modal` and confirmation flows: make cancel/confirm semantics explicit and idempotent; do not hide backend failure messages.
- `Tag`, `Tooltip`, `Alert`, `Spin`, `Empty`, and `Result`: use them for scan-friendly status, explanation, loading, empty data, authorization, and hard-error states.

## Warning Avoidance

- Avoid unstable array indexes as keys for Menu, Tree, Table, lists, and cards unless the data has no persistent identity and cannot be reordered.
- Do not mix deprecated AntD APIs with new `items`, `open`, or `variant` APIs in newly written code.
- Keep responsive layouts explicit with `Row`/`Col`, `Space wrap`, and constrained text so labels do not overlap or resize panels unexpectedly.
- Check long text in both Chinese and English language modes when the change affects labels, navigation, table columns, or buttons.

## Validation

- For AntD-only skill/docs changes, validate `SKILL.md` format and `git diff --check`.
- For UI code, run focused tests or build, and use browser verification when layout, navigation, Menu/Tree selection, or responsive behavior changed.
- Record any remaining AntD warning risk, especially around controlled `openKeys`, duplicate keys, missing `rowKey`, or long-text overflow.
