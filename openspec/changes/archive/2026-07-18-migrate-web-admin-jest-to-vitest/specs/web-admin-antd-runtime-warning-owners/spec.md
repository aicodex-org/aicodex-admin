## MODIFIED Requirements

### Requirement: AntD runtime warning 必须映射到真实 production owner
`web-admin` SHALL 在固定test环境以non-silent、非watch、单worker、文件串行Vitest将AntD 5.29.3 runtime warning映射到具体suite、message和production owner。验证 SHALL 记录脱敏计数，不得提交原始长日志、通过源码字符串替代运行时证据或把不可稳定映射的warning机械归因。

#### Scenario: 迁移记录保留最新 owner 基线
- **WHEN** 开发者review本change的迁移验证记录
- **THEN** 记录 SHALL 包含最新任务基线下7/7 suites、125/125 tests、0 failure的变更前证据
- **AND** SHALL 包含47条目标AntD warning，并按InputNumber 23、Card 7、Typography.Text 7、Descriptions 6、Table 2、Collapse 1、Spin 1分类
- **AND** 每类 SHALL 映射到proposal列出的6个production文件，不得接管其它route的Provider或unique-key owner

#### Scenario: 无法稳定映射的新 warning
- **WHEN** 最新base或完整non-silent运行出现proposal未列出的AntD warning
- **THEN** 实现 SHALL 保持该warning可见并记录suite/message
- **AND** 在无法由stack、render路径和production API稳定确定owner时 SHALL 停止对应写操作，不得为清零数字猜测修改

#### Scenario: 单元runner迁移不隐藏warning
- **WHEN** 同一warning owner suite从Jest迁移到Vitest
- **THEN** 原始console输出与局部guard SHALL 继续可见并可归因
- **AND** migration SHALL NOT在setup/config添加console suppression或按warning文本吞错

### Requirement: Warning guard 与完整质量门禁不得静默诊断
7个目标suite SHALL 使用局部console spy保留原始输出、分类AntD warning并在恢复spy后断言目标warning为空。实现 SHALL NOT 修改Vitest全局config/setup以suppression/filter console、mock AntD、使用silent、skip/only、任意sleep、提高timeout或放宽业务断言制造通过。

#### Scenario: TDD RED 与 focused GREEN
- **WHEN** production owner尚未迁移而目标suite加入warning guard
- **THEN** non-silent focused run SHALL 因现有AntD warning得到有效RED且原warning仍可见
- **AND** production owner迁移后相同7个suite SHALL 以0 failure和目标AntD warning=0完成

#### Scenario: 完整前端与依赖门禁
- **WHEN** change准备归档
- **THEN** package/lock完整性与标准Bun安装入口 SHALL 通过
- **AND** changed production statements/lines SHALL 达到85%；仅测试工具链迁移时production coverage SHALL 记录为N/A
- **AND** 全量non-silent Vitest与`test:ci`、app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts、Vite build SHALL 通过
- **AND** Playwright discovery SHALL 保持19 files / 22 tests
- **AND** 完整non-silent分类中的目标AntD warning SHALL 保持0，非目标React/runtime类别 SHALL 不得因新增过滤消失

#### Scenario: Chromium代表路径验收
- **WHEN** 使用production preview和脱敏fixture在1440/390验证受影响代表页面
- **THEN** 数值单位、商品卡/省略、订单/购物车/付款状态与Feishu折叠交互 SHALL 可用且页面级overflow为0
- **AND** 非预期console、pageerror和requestfailed SHALL 为0
- **AND** 验证 SHALL NOT 连接60、真实支付、真实企业账号、凭据或摄像头
