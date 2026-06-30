## Why

上一批共享 UI primitives 已经迁移到 TS/TSX，但 `web-admin/src/common` 下仍有验证码、OAuth/SAML 展示、发送验证码、分页选择、主题编辑和复杂 modal 等 legacy JavaScript 组件。后续页面迁移继续穿过这些动态边界，会让 props、form、modal callback、第三方控件和主题 token 类型在调用方重复补洞。

本 change 在暂无新功能插队时，批量迁移剩余 common widgets / modal / theme / select 组件，继续降低 Admin 前端 JS 残留，并保持用户可见行为和后端契约不变。

## What Changes

- 将 `web-admin/src/common/CaptchaWidget.js`、`OAuthWidget.js`、`SamlWidget.js`、`SendCodeInput.js`、`PaginateSelect.js` 迁移为 `.tsx`。
- 将 `web-admin/src/common/notifaction/EnableMfaNotification.js` 迁移为 `.tsx`。
- 将 `web-admin/src/common/select/AffiliationSelect.js` 迁移为 `.tsx`。
- 将 `web-admin/src/common/theme/RadiusPicker.js`、`ColorPicker.js`、`ThemeEditor.js`、`ThemePicker.js` 迁移为 `.tsx`。
- 将 `web-admin/src/common/modal/ResetModal.js`、`PasswordModal.js`、`AgreementModal.js`、`CropperDivModal.js`、`FaceRecognitionModal.js`、`FaceRecognitionCommonModal.js` 迁移为 `.tsx`。
- 迁移以机械 `git mv`、局部 props/state/event 类型和 `LegacyAny` 边界为主；不做 UI、交互或 API 行为重构。
- 如单个组件牵出过大的第三方控件、媒体、人脸识别或认证链路风险，可记录为 deferred，并继续完成其它低风险组件。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加剩余 common widgets / modal / theme / select 组件的批量 TypeScript 迁移要求、边界和验证门禁。

## Impact

- Affected frontend components:
  - `web-admin/src/common/CaptchaWidget.js`
  - `web-admin/src/common/OAuthWidget.js`
  - `web-admin/src/common/SamlWidget.js`
  - `web-admin/src/common/SendCodeInput.js`
  - `web-admin/src/common/PaginateSelect.js`
  - `web-admin/src/common/notifaction/EnableMfaNotification.js`
  - `web-admin/src/common/select/AffiliationSelect.js`
  - `web-admin/src/common/theme/*Picker.js`、`ThemeEditor.js`
  - `web-admin/src/common/modal/{ResetModal,PasswordModal,AgreementModal,CropperDivModal,FaceRecognitionModal,FaceRecognitionCommonModal}.js`
- Explicitly out of scope:
  - `EntryPage`、`CaptchaPage`、`QrCodePage`、`web-admin/src/basic/*`、`account/WeComProfileSyncPanel*`、`AccountAvatar`、`pricing/SingleCard`、`IframeEditor`、`ToolTable`、`TourConfig*`
  - `web-admin/src/table/*`
  - `web-admin/src/auth/*`、`web-admin/src/provider/*`、`ProviderEditPage*`、`ApplicationEditPage*`、`SyncerEditPage*`、backend、root shell/config
- Validation:
  - `openspec validate migrate-admin-remaining-common-widgets-to-typescript --strict`
  - `git diff --check origin/hfl-test-base..HEAD`
  - focused Jest for touched existing tests when present
  - `yarn typecheck`
  - `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - `yarn build`
