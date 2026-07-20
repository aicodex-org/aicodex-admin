## MODIFIED Requirements

### Requirement: Admin 前端必须锁定维护中的 AntD 5 版本
`web-admin` SHALL 精确锁定官方 npm `latest-5` 对应的 AntD 5.29.3，并 SHALL 使用唯一 `bun.lock`和Bun标准安装入口完成可复现lifecycle install。实现 MUST NOT 升级到AntD 6、放宽为浮动版本或顺手升级React、Router、Vitest、Vite、Playwright、Bun及其它无关直接依赖。

#### Scenario: 依赖与实际安装版本一致
- **WHEN** 开发者从空的目标依赖树执行 `bun run deps:install`
- **THEN** `package.json`、`bun.lock`与实际 `antd/package.json` SHALL 都解析为5.29.3
- **AND** React/ReactDOM peer SHALL 继续由仓库当前React 18满足

#### Scenario: 版本边界不扩大
- **WHEN** 生成升级后的lock diff
- **THEN** 直接依赖变化 SHALL 只包含 `antd` 5.24.1→5.29.3
- **AND** 间接变化 SHALL 可追溯到AntD/rc-*解析，不得引入AntD 6或双AntD主版本

### Requirement: 升级必须通过完整前端与浏览器门禁
升级 SHALL 以changed production coverage、全量前端门禁、真实Chromium production preview和同口径bundle/warning对比作为交付门槛。验证 MUST NOT 通过console suppression、skip、任意sleep、放宽断言或真实企业凭据制造通过。

#### Scenario: 自动化质量门禁
- **WHEN** change准备归档
- **THEN** changed executable statements/lines SHALL 达到85%
- **AND** Bun标准安装、全量Vitest、app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts check/build/smoke与Vite build SHALL 全部通过
- **AND** Playwright discovery SHALL 保持19 files / 22 tests

#### Scenario: Chromium生命周期与布局验证
- **WHEN** 使用脱敏fixture/mock media在production preview验证Captcha/Face、一个普通Drawer和一个WeCom modal
- **THEN** close-reopen、资源/异步清理、焦点回归和1440/390布局 SHALL 符合各owner契约
- **AND** 非预期console、pageerror和requestfailed SHALL 为0，且不得连接60、真实摄像头或企业凭据

#### Scenario: Bundle和warning不发生无解释回退
- **WHEN** 以升级前后相同Node/Bun/Vite命令比较production build
- **THEN** 验证 SHALL 记录总asset字节、关键大chunk和warning类别
- **AND** 新增AntD runtime/deprecation warning或无解释的大幅bundle回退 SHALL 阻止归档
