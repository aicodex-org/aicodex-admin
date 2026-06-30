## 1. OpenSpec

- [x] 1.1 创建 `migrate-admin-remaining-common-widgets-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 组件迁移

- [x] 2.1 将 `web-admin/src/common/CaptchaWidget.js`、`OAuthWidget.js`、`SamlWidget.js` 迁移为 `.tsx`，保留验证码和 OAuth/SAML 展示语义。
- [x] 2.2 将 `web-admin/src/common/SendCodeInput.js`、`PaginateSelect.js` 和 `common/notifaction/EnableMfaNotification.js` 迁移为 `.tsx`，保留发送验证码、分页加载和 notification 行为。
- [x] 2.3 将 `web-admin/src/common/select/AffiliationSelect.js` 迁移为 `.tsx`，保留隶属关系查询、过滤和选择回调。
- [x] 2.4 将 `web-admin/src/common/theme/RadiusPicker.js`、`ColorPicker.js`、`ThemeEditor.js`、`ThemePicker.js` 迁移为 `.tsx`，保留主题 token 编辑和预览行为。
- [x] 2.5 将 `web-admin/src/common/modal/ResetModal.js`、`PasswordModal.js`、`AgreementModal.js`、`CropperDivModal.js`、`FaceRecognitionModal.js`、`FaceRecognitionCommonModal.js` 迁移为 `.tsx`，保留确认、取消、裁剪、人脸识别和错误展示语义。
- [x] 2.6 明确 deferred 文件及原因，特别是第三方控件、媒体、人脸识别、认证链路、页面级业务或并行 owner 写集风险。

## 3. 验证

- [x] 3.1 运行 `openspec validate migrate-admin-remaining-common-widgets-to-typescript --strict`。
- [x] 3.2 运行 `git diff --check origin/hfl-test-base..HEAD`。
- [x] 3.3 运行本次触碰的 existing focused Jest；如没有现成 touched tests，明确记录未使用 0 tests 作为通过证据。
- [x] 3.4 在 `web-admin` 运行 `yarn typecheck`。
- [x] 3.5 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.6 在 `web-admin` 运行 `yarn build`。
- [x] 3.7 在 `verification.md` 记录命令、结果、deferred 文件和剩余风险，验证记录保持脱敏。

## 4. 收口

- [x] 4.1 完成归档前 review，确认代码、文档、spec、测试和验证记录无阻塞问题。
- [x] 4.2 archive change 后收敛为单 change commit，rebase 到最新 `origin/hfl-test-base`，push `hfl-test-base`，删除本地/远端工作分支。
