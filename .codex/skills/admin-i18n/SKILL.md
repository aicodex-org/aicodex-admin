---
name: admin-i18n
description: Use when adding, reviewing, or modifying user-visible text, menus, navigation IA, page titles, buttons, status labels, errors, zh/en locale entries, AntD locale behavior, or sensitive text handling in the aicodex-admin web-admin frontend.
---

# Admin Internationalization

## Baseline

- `web-admin/src/i18n.js` initializes i18next with namespaces from `src/locales/en/data.json` and dynamically loads `src/locales/<language>/data.json`.
- Existing components commonly call `i18next.t("namespace:Key")`; prefer existing namespaces such as `general`, `account`, `application`, and the domain-specific namespace already used by nearby files.
- AntD locale is selected in `src/App.js` through `getAntdLocale(Setting.getLanguage())`.
- New user-visible text for Admin route work should not be hard-coded into business components when it can be represented as locale keys.

## Editing Rules

- Add or update both `src/locales/zh/data.json` and `src/locales/en/data.json` for new visible labels, navigation names, page titles, buttons, status text, empty states, validation messages, and errors.
- Keep the locale key stable and English-readable; keep translations semantically equivalent rather than literal when concise UI copy differs by language.
- When changing enterprise navigation IA, update the full path: `enterpriseNavigation.js`, `ManagementPage.js` routes or selection logic if needed, `NavItemTree` behavior/config tree expectations, and zh/en locale keys.
- Do not create Chinese/English mixed UI by adding only one language or by using fallback English for Chinese-only admin labels.
- Do not write passwords, tokens, cookies, client secrets, private URLs, or connection strings into locale files, screenshots, reports, errors, or examples.
- If backend `res.msg` is surfaced directly, preserve the server message for diagnosis, but keep the surrounding UI text localized.

## Review Checklist

- Search touched code for new literal UI strings in JSX, button labels, titles, tooltips, alerts, status tags, table column titles, modal content, and placeholders.
- Check that new locale keys exist under both `zh` and `en`; for other locale files, follow project practice only when the task explicitly requires broader translation.
- Verify route/menu labels in English mode do not show Chinese leftovers and Chinese mode does not show avoidable English fallback.
- If the change affects navigation config, verify organization admin/user navigation trees still use stable keys and reflect the same IA as the sidebar.

## Validation

- For i18n-only skill/docs changes, validate `SKILL.md` format and `git diff --check`.
- For i18n code changes, run focused navigation/page tests when present and use browser inspection for language-mode regressions when labels or navigation changed.
