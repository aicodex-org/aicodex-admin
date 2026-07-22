## MODIFIED Requirements

### Requirement: 版本边界与验证保持 fail-closed
本 change SHALL 精确锁定 AntD 5.29.3、唯一 `bun.lock`和真实 `destroyOnHidden` 类型，并 SHALL 将原先因5.24.1类型限制而defer的11处overlay销毁语义完成迁移。实现 SHALL NOT 使用类型断言、`any`、ignore directive、双lock或未知JSX prop伪造兼容。既有 `Space.Compact` 与自定义overlay `open`契约 SHALL 保持不变。

#### Scenario: 当前维护版本支持 destroyOnHidden
- **WHEN** 开发者完成AntD 5.29.3升级和目标prop迁移
- **THEN** production源码中的 `destroyOnClose` SHALL 为0
- **AND** `destroyOnHidden` SHALL 为11且通过实际Modal/Drawer类型校验
- **AND** package、lock和实际安装版本 SHALL 精确一致，不得升级AntD 6或其它无关直接依赖

#### Scenario: 完整前端质量门禁
- **WHEN** change准备归档
- **THEN** 目标AntD runtime/deprecated warning SHALL 为0
- **AND** changed production coverage SHALL 达到85%
- **AND** Vitest SHALL 发现不低于当前活动基线的全部suite/test并以0 failure完成
- **AND** app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts、Vite build与19 files / 22 tests Playwright discovery SHALL 通过
- **AND** 脱敏浏览器smoke SHALL 覆盖Captcha/Face、普通Drawer、WeCom modal的关闭/重开、焦点、资源/异步清理和窄屏，page error与非预期console error SHALL 为0
