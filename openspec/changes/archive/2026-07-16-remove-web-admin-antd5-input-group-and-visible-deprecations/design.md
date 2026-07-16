## Context

最新基线固定 `antd 5.24.1`。源码审计确认：

- `LoginPage`、`SignupPage`、`UserEditPage`、`SmsProviderFields` 共 4 处 `Input.Group`。
- `CaptchaModal` 有 `CaptchaPage`、`LoginPage`、`SendCodeInput`、`CaptchaPreview` 4 个 `visible` 调用点。
- `FaceRecognitionCommonModal` 与 `FaceRecognitionModal` 有 `LoginPage` 两个 `visible` 调用点，`FaceRecognitionModal` 另有 `FaceIdTable` 一个调用点。
- 生产源码共有 11 处 `destroyOnClose`，其中目标 modal 链占 4 处。5.24.1 本地 `ModalProps` 类型包含 `destroyOnClose`，不包含 `destroyOnHidden`。

本 change 只处理当前版本能做机械等价迁移的 `Input.Group` 与 `visible`。Provider/Syncer 编辑页、企业 TLS 字段、依赖升级和 overlay 销毁语义属于独立 owner 或版本边界。

## Goals / Non-Goals

**Goals:**

- 让四组输入组合使用 `Space.Compact`，并保持原宽度比例、固定宽度、DOM 顺序、表单规则和键盘操作。
- 让三个自定义 modal wrapper 对外只接收 `open`，所有目标调用方端到端同步，普通业务数据中的 `visible` 字段不变。
- 保持验证码加载、发送验证码、人脸识别媒体清理、关闭/重开和异步 loading 行为兼容。
- 用直接 Jest、changed production coverage、全量质量门禁和浏览器 smoke 证明迁移没有隐藏 warning 或回归。

**Non-Goals:**

- 不升级 AntD、React、RTL、Jest、Vite 或 Playwright，不修改 `package.json` / `yarn.lock`。
- 不迁移 `destroyOnClose`，不用 `any`、类型断言或未知属性伪装 `destroyOnHidden`。
- 不修改 ProviderEditPage、SyncerEditPage、TLS policy UI、后端 API、认证 payload、schema、CI workflow 或 `test` 分支。
- 不把账号字段、表单配置等普通业务 `visible` 属性改名为 `open`，不重写 modal 内部业务流程。

## Decisions

### 1. 输入组合使用 `Space.Compact` 并显式保持占宽语义

四个调用点均保持既有子控件顺序与宽度。登录和注册使用 35%/65% 比例，用户编辑保持 280px 与 30%/70%，短信测试保持 90px/150px。`Space.Compact` 使用 `block` 或等价显式宽度承接原 `Input.Group compact` 的容器占宽，避免默认 `inline-flex` 导致表单收缩；不新增页面级 CSS 或响应式重构。

### 2. 自定义 overlay prop 端到端统一为 `open`

`CaptchaModal`、`FaceRecognitionCommonModal`、`FaceRecognitionModal` 的 props 解构、effect 依赖和内部开启判断统一使用 `open`。所有七个调用点同步传递 `open`，最终仍由 wrapper 向 AntD `Modal open={...}` 映射。内部派生状态（例如验证码加载后才真正展示 modal、摄像头捕获完成后才展示）保持原语义，不把调用方布尔值直接替换内部状态。

调用链之外的业务 `visible` 字段保持原名。验证使用精确文件集搜索，而不是对整个仓库做无差别 token 替换。

### 3. `destroyOnClose` 在当前版本 fail-closed defer

AntD 5.24.1 类型只支持 `destroyOnClose`，没有 `destroyOnHidden`。本 change 保持 11 处生产计数和所有销毁行为不变；任何迁移都必须等待后续 AntD minor 升级评估，并重新验证 modal 关闭后的表单、媒体和异步清理。禁止通过 `as any`、`@ts-ignore` 或未知 JSX prop 制造表面清零。

### 4. TDD 先暴露 warning/API 契约，再做最小迁移

RED 阶段通过直接组件测试验证 `Space.Compact` 的语义 class/占宽、wrapper 的 `open` prop 和 modal 关闭/重开行为；移除 `UserEditPage` 的 `Input.Group` warning 分支后，旧实现应因明确的 deprecated warning 或缺少目标语义失败。测试不检查依赖源码字符串，不 mock 掉目标 warning，也不依赖测试顺序。

GREEN 阶段只修改目标 import、JSX wrapper 与 prop 名称。随后运行目标测试、changed production coverage、全量 Jest 和静态/构建/浏览器门禁。

### 5. 浏览器验证使用脱敏 fixture，不触碰真实认证

本 change 只验证前端渲染与交互。浏览器 smoke 使用本地前端和项目现有脱敏 fixture/route override，覆盖登录、注册、用户编辑、验证码与人脸 modal 的开关、窄屏和键盘路径；不提交真实账号、Cookie、token、手机号或 Provider secret，也不把本地 UI smoke 表述为真实认证验收。

## Risks / Trade-offs

- [`Space.Compact` 默认是 `inline-flex`，可能改变组合宽度] → 在各调用点显式保持原占宽与子控件宽度，并做桌面/窄屏 smoke。
- [wrapper prop 改名遗漏懒加载调用点] → 用调用链审计、TypeScript、精确 `rg` 与直接测试共同兜底。
- [人脸 modal 的摄像头和 interval 生命周期复杂] → 不重写生命周期，只替换 prop 名称；测试关闭/重开和 cleanup，浏览器 fixture 不请求真实摄像头。
- [全量 Jest 仍输出其它历史 AntD/act warning] → 不新增 suppression；记录目标 warning 为 0，并把非目标 warning 按原类别保留可审计。
- [本地浏览器 fixture 不能证明真实 OAuth/人脸认证] → verification 明确证据层级；本 change 不改变认证协议或后端契约。

## Migration Plan

1. 固化 4/7/3/11 基线、目标测试与前端脚本/discovery 基线。
2. 新增或调整直接测试，确认旧实现对目标 API/告警契约产生预期 RED。
3. 迁移四组输入组合，端到端重命名三个 modal wrapper 的 `open` prop，并删除 UserEdit 目标 warning 过滤。
4. 运行聚焦 Jest、coverage、全量 Jest、三类 typecheck、增量 TS、lint、public scripts、Vite build、Playwright discovery 与浏览器 smoke。
5. 完成 pre-archive review、archive/主规格同步、latest base + 1 logical commit 与 controller self-closeout。

回滚只需 revert 单个最终 commit；没有依赖、数据或后端迁移。

## Open Questions

无。目标 API、版本边界、写集、验证和 defer 依据均已由当前代码与 controller envelope 收口。
