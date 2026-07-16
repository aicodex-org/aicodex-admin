## MODIFIED Requirements

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
