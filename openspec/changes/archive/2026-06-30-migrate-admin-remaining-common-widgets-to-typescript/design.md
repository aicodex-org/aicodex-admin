## Context

`web-admin` 当前允许 `.js`、`.ts`、`.tsx` 共存，并已经把多批页面、backend wrapper、auth、provider 和共享 UI primitives 迁移到 TypeScript。剩余 common widgets 多数是历史展示/表单/弹窗组件，调用方仍通过无后缀 import 消费；迁移风险主要来自动态 form props、第三方控件声明、媒体/cropper/face-api 类型和 legacy 后端返回 shape。

本 change 只处理明确列出的 common widgets / modal / theme / select 文件，不扩大到页面、auth/provider/backend/root shell/table 等并行写集。

## Goals / Non-Goals

**Goals:**

- 将剩余 common widgets、modal、theme、select 低风险组件迁移为 `.tsx`。
- 使用局部 props/state/event 类型描述组件实际读取字段，必要时用 `LegacyAny` 或命名 record 边界封住 legacy 动态对象。
- 保持 extensionless import、默认/具名导出、表单字段回写、modal 确认/取消、验证码、OAuth/SAML 展示、发送验证码、分页选择、主题编辑、裁剪和人脸识别行为兼容。
- 明确记录 deferred 文件和原因，避免单个复杂组件阻塞整批迁移。

**Non-Goals:**

- 不修改 UI 视觉、文案、布局、i18n、权限或后端 API 契约。
- 不重构验证码、OAuth/SAML、发送验证码、分页选择、主题编辑、modal 确认/裁剪/人脸识别交互语义。
- 不触碰 `EntryPage`、`CaptchaPage`、`QrCodePage`、`web-admin/src/basic/*`、`account/WeComProfileSyncPanel*`、`AccountAvatar`、`pricing/SingleCard`、`IframeEditor`、`ToolTable`、`TourConfig*`。
- 不触碰 `web-admin/src/table/*`、`web-admin/src/auth/*`、`web-admin/src/provider/*`、`ProviderEditPage*`、`ApplicationEditPage*`、`SyncerEditPage*`、backend 或 root shell/config。

## Decisions

### 1. 机械迁移优先

迁移动作以 `git mv`、`.tsx` 后缀、局部 TypeScript 类型和必要 import 调整为主。只有 TypeScript、ESLint、Jest 或 build 所需的最小代码调整进入实现；不借迁移机会改变组件行为。

### 2. 局部类型封边，不抽公共框架

组件 props 优先在当前文件内定义。对于 legacy 动态对象、第三方 callback、form 实例和后端响应，只描述组件实际消费字段；无法低风险精确建模时使用 `LegacyAny`、`unknown` 收窄或命名 record 类型，不扩散全局宽松类型。

### 3. 第三方控件和媒体链路保守处理

裁剪、人脸识别、主题 token 和 AntD 表单/选择器事件只做类型适配。若某个组件需要重塑第三方控件生命周期、媒体权限、face-api 初始化、上传/裁剪 payload 或认证链路，记录 deferred。

### 4. 验证以编译链路为主

本批默认不改变交互语义，因此不要求浏览器 smoke。验证重点是 OpenSpec strict、diff check、existing focused Jest（若触碰现有测试）、`yarn typecheck`、增量 TS gate 和 `yarn build`。

## Risks / Trade-offs

- [Risk] 部分组件缺少 existing focused tests，覆盖率难以反映所有迁移文件行为。
  [Mitigation] 不伪造 0 tests；在 `verification.md` 记录无现成测试的事实，以 typecheck、增量 TS gate、production build 和保留导出路径作为机械迁移证据。
- [Risk] 裁剪和人脸识别第三方类型不完整。
  [Mitigation] 使用局部声明或 `LegacyAny` 封边；不重写媒体/裁剪/识别流程。
- [Risk] 主题编辑组件使用动态 token 和颜色对象。
  [Mitigation] 只为当前读取/回写字段建模，不引入新的主题抽象。
