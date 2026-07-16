# web-admin-antd5-deprecation-cleanup Specification

## Purpose

定义 Admin 前端在固定 AntD 5.24.1 上迁移 deprecated 输入组合与 overlay prop 时必须保持的等价交互、版本边界和验证要求。

## Requirements
### Requirement: 输入组合使用当前 AntD Compact API

`web-admin` SHALL 使用 AntD 5.24.1 当前支持的 `Space.Compact` 表达登录、注册、用户编辑和短信测试中的相邻输入组合，并 SHALL 保持既有控件顺序、宽度、表单规则、输入回调、键盘操作和响应式行为。生产源码 SHALL NOT 在这些目标路径继续使用 `Input.Group`。

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

本 change SHALL 保持 AntD 5.24.1、依赖锁和 `destroyOnClose` 行为不变。由于 5.24.1 不支持 `destroyOnHidden`，实现 SHALL NOT 使用类型断言、`any`、ignore directive 或未知 JSX prop 伪迁移。验证 SHALL 覆盖直接 Jest、changed production coverage、完整静态/构建门禁和脱敏浏览器 smoke，且 SHALL NOT 通过 console suppression、skip、sleep、timeout 或放宽断言制造通过。

#### Scenario: 当前版本不支持 destroyOnHidden

- **WHEN** 开发者完成本次 deprecated API 清理
- **THEN** 生产源码中的 `destroyOnClose` 基线计数 SHALL 保持 11
- **AND** `destroyOnHidden` SHALL NOT 被添加到当前 5.24.1 代码
- **AND** verification SHALL 记录 defer 到后续 AntD minor 升级评估的依据

#### Scenario: 完整前端质量门禁

- **WHEN** change 准备归档
- **THEN** 目标 deprecated warning SHALL 为 0
- **AND** changed production coverage SHALL 达到 85%
- **AND** Jest SHALL 发现至少 145 个 suite / 1371 个 test 并以 0 failure 完成
- **AND** app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts、Vite build 与 19 files / 22 tests Playwright discovery SHALL 通过
- **AND** 脱敏浏览器 smoke SHALL 覆盖输入组合、modal 开关、关闭/重开、窄屏、page error 与非预期 console error
