# web-admin-antd5-deprecation-cleanup Specification

## Purpose

定义 Admin 前端在精确锁定的 AntD 5.29.3 上使用当前输入组合与 overlay API 时必须保持的等价交互、销毁生命周期、版本边界和验证要求。

## Requirements
### Requirement: 输入组合使用当前 AntD Compact API

`web-admin` SHALL 在精确锁定的 AntD 5.29.3 上使用当前支持的 `Space.Compact` 表达登录、注册、用户编辑和短信测试中的相邻输入组合，并 SHALL 保持既有控件顺序、宽度、表单规则、输入回调、键盘操作和响应式行为。生产源码 SHALL NOT 在这些目标路径继续使用 `Input.Group`。

#### Scenario: 登录与注册手机号组合保持等价

- **WHEN** 用户在登录或注册表单中使用国家区号与手机号组合
- **THEN** 区号选择器 SHALL 保持在手机号输入框之前
- **AND** 两个控件 SHALL 保持 35%/65% 的既有占宽与紧凑边界
- **AND** country code/phone validation、输入回调和键盘提交 SHALL 保持兼容

#### Scenario: 用户编辑与短信测试组合保持等价

- **WHEN** 管理员编辑用户手机号或在短信 Provider 字段中填写测试手机号
- **THEN** 用户编辑组合 SHALL 保持 280px 容器与 30%/70% 子控件比例
- **AND** 短信测试组合 SHALL 保持 90px 区号选择器、150px 手机号输入框与原发送按钮顺序
- **AND** update callback、disabled 状态和发送测试短信参数 SHALL 保持兼容

### Requirement: 自定义 AntD overlay 使用 open prop

验证码与人脸识别自定义 modal wrapper SHALL 对外使用 `open` prop，并 SHALL 将调用方状态端到端映射到 AntD `Modal open`。目标 wrapper 与调用点 SHALL NOT 继续使用 deprecated `visible` prop；普通账号、表单或业务数据的 `visible` 字段 SHALL 保持原业务语义。

#### Scenario: 验证码 modal 打开、关闭与重开

- **WHEN** 登录、独立验证码页、发送验证码或验证码预览触发 `CaptchaModal`
- **THEN** 调用方 SHALL 通过 `open` 传递开启状态
- **AND** captcha 加载、token 更新、确认、取消、关闭后清理与再次打开 SHALL 保持兼容
- **AND** inline captcha 的 `noModal` 路径 SHALL NOT 因 prop 迁移改变

#### Scenario: 人脸识别 modal 打开、关闭与重开

- **WHEN** 登录或用户 Face ID 表触发人脸识别 modal
- **THEN** 调用方 SHALL 通过 `open` 传递开启状态
- **AND** 摄像头/上传模式、模型 loading、确认、取消、媒体 track 与 interval cleanup SHALL 保持兼容
- **AND** 关闭后再次打开 SHALL NOT 复用已清理的捕获状态

### Requirement: 版本边界与验证保持 fail-closed

本 change SHALL 精确锁定 AntD 5.29.3、唯一 Yarn lock和真实 `destroyOnHidden` 类型，并 SHALL 将原先因5.24.1类型限制而 defer的11处overlay销毁语义完成迁移。实现 SHALL NOT 使用类型断言、`any`、ignore directive、双 lock或未知 JSX prop伪造兼容。既有 `Space.Compact` 与自定义 overlay `open` 契约 SHALL 保持不变。

#### Scenario: 当前维护版本支持 destroyOnHidden

- **WHEN** 开发者完成 AntD 5.29.3升级和目标 prop迁移
- **THEN** 生产源码中的 `destroyOnClose` SHALL 为0
- **AND** `destroyOnHidden` SHALL 为11且通过实际 Modal/Drawer类型校验
- **AND** package、lock和实际安装版本 SHALL 精确一致，不得升级 AntD 6或其它无关直接依赖

#### Scenario: 完整前端质量门禁

- **WHEN** change准备归档
- **THEN** 目标 AntD runtime/deprecated warning SHALL 为0
- **AND** changed production coverage SHALL 达到85%
- **AND** Jest SHALL 发现至少145个 suite / 1371个 test并以0 failure完成
- **AND** app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts、Vite build与19 files / 22 tests Playwright discovery SHALL 通过
- **AND** 脱敏浏览器 smoke SHALL 覆盖 Captcha/Face、普通 Drawer、WeCom modal的关闭/重开、焦点、资源/异步清理和窄屏，page error与非预期 console error SHALL 为0
