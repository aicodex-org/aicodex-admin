# web-admin-antd-runtime-warning-owners Specification

## Purpose

定义 `web-admin` 在 AntD 5.29.3 下对可稳定映射的 runtime warning owner、当前API等价迁移、局部non-silent防回退以及完整前端与浏览器验收的长期契约。

## Requirements
### Requirement: AntD runtime warning 必须映射到真实 production owner

`web-admin` SHALL 在固定 test 环境以 non-silent、非 watch、`--runInBand` Jest 将 AntD 5.29.3 runtime warning映射到具体 suite、message和production owner。验证 SHALL 记录脱敏计数，不得提交原始长日志、通过源码字符串替代运行时证据或把不可稳定映射的 warning机械归因。

#### Scenario: 迁移记录保留最新 owner 基线

- **WHEN** 开发者review本change的迁移验证记录
- **THEN** 记录 SHALL 包含最新任务基线下7/7 suites、125/125 tests、0 failure的变更前证据
- **AND** SHALL 包含47条目标AntD warning，并按InputNumber 23、Card 7、Typography.Text 7、Descriptions 6、Table 2、Collapse 1、Spin 1分类
- **AND** 每类 SHALL 映射到proposal列出的6个production文件，不得接管Admin-2的Provider或unique-key owner

#### Scenario: 无法稳定映射的新 warning

- **WHEN** 最新base或完整non-silent运行出现proposal未列出的AntD warning
- **THEN** 实现 SHALL 保持该warning可见并记录suite/message
- **AND** 在无法由stack、render路径和production API稳定确定owner时 SHALL 停止对应写操作，不得为清零数字猜测修改

### Requirement: 数值输入迁移必须保持单位与数值契约

Application编辑表单 SHALL 使用AntD 5.29.3当前InputNumber API表达顺序、Cookie时长、token时长、失败次数、冻结分钟与重发秒数。实现 MUST NOT 继续传递`addonAfter`，并 SHALL 保持原150px输入宽度、value、min、step、precision、格式化、单位和更新回调。

#### Scenario: 空单位不创建额外结构

- **WHEN** 管理员编辑Application顺序字段
- **THEN** InputNumber SHALL 保持整数、最小值0与原更新回调
- **AND** 空`addonAfter` SHALL 被删除且不得创建空的可聚焦单位控件

#### Scenario: 本地化单位与精度保持

- **WHEN** 管理员查看或修改Cookie、token、失败限制与验证码超时字段
- **THEN** 小时、次数、分钟与秒单位 SHALL 继续按当前语言显示
- **AND** 整数与两位小数precision、min、step、value和`onChange` SHALL 与迁移前一致
- **AND** 390px视口 SHALL 不因单位迁移产生页面级横向溢出

### Requirement: Card、Typography、Descriptions 与 Collapse 必须使用当前语义API

Product card、Order payment description和Feishu handoff details SHALL 使用AntD 5.29.3当前semantic styles、Typography和Collapse API。迁移 SHALL 保持既有内容、布局、截断、列跨度、展开交互与隐藏后销毁语义。

#### Scenario: Product card 保持布局和两行详情

- **WHEN** Product store渲染带detail的商品卡
- **THEN** Card body SHALL 继续使用flex列布局并保持操作区底部对齐
- **AND** 商品detail SHALL 以支持`rows:2`的Typography组件显示secondary样式和两行ellipsis
- **AND** 实现 SHALL NOT 使用`bodyStyle`或类型断言把不支持的Text ellipsis props传给AntD

#### Scenario: Order label宽度保持

- **WHEN** Order payment页渲染多个商品Descriptions
- **THEN** label语义宽度 SHALL 保持150px、两列和原item span
- **AND** 实现 SHALL 使用`styles.label`且不得继续传递`labelStyle`

#### Scenario: Feishu详细清单销毁语义保持

- **WHEN** 管理员展开并关闭compact handoff详细清单
- **THEN** Collapse item、key、label和展开交互 SHALL 保持不变
- **AND** 隐藏panel child SHALL 按`destroyOnHidden`销毁且不得继续使用`destroyInactivePanel`

### Requirement: Table row identity 与 Spin processing 状态必须稳定且可访问

Cart Table SHALL 使用不依赖数组index的稳定业务row key；PaymentResult处理中分支 SHALL 保留可见spinner并提供可感知的处理中状态。迁移 SHALL NOT 改变购物车增删下单、支付状态或跳转契约。

#### Scenario: 相同商品的不同充值金额保持独立row

- **WHEN** Cart同时包含name、pricingName和planName相同但price不同的充值条目
- **THEN** 两条记录 SHALL 使用不同且跨reorder稳定的row key
- **AND** rowKey函数 SHALL 只接收record，不得读取index
- **AND** 数量、删除、清空与下单payload SHALL 保持原语义

#### Scenario: Payment processing状态可见且可访问

- **WHEN** Payment状态为`Created`
- **THEN** Result SHALL 继续显示处理中title/subtitle和Spin指示器
- **AND** processing状态 SHALL 具有可见文本与`role=status`或等价可访问语义
- **AND** 实现 SHALL NOT 在非nested/fullscreen Spin上传递无效`tip`

### Requirement: Warning guard 与完整质量门禁不得静默诊断

7个目标suite SHALL 使用局部console spy保留原始输出、分类AntD warning并在恢复spy后断言目标warning为空。实现 SHALL NOT 修改Jest全局config/setup、使用console suppression/filter、mock AntD、silent、skip/only、任意sleep、提高timeout或放宽业务断言制造通过。

#### Scenario: TDD RED 与 focused GREEN

- **WHEN** 生产owner尚未迁移而目标suite加入warning guard
- **THEN** non-silent focused run SHALL 因现有AntD warning得到有效RED且原warning仍可见
- **AND** 生产owner迁移后相同7个suite SHALL 以0 failure和目标AntD warning=0完成

#### Scenario: 完整前端与依赖门禁

- **WHEN** change准备归档
- **THEN** package/lock SHA-256 SHALL 与变更前逐字一致且frozen Yarn install SHALL 通过
- **AND** changed production statements/lines SHALL 达到85%
- **AND** 全量non-silent Jest与`test:ci`、app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts、Vite build SHALL 通过
- **AND** Playwright discovery SHALL 保持19 files / 22 tests
- **AND** 完整non-silent分类中的本change目标AntD warning SHALL 从47降为0，非目标React/runtime类别 SHALL 不得因新增过滤消失

#### Scenario: Chromium代表路径验收

- **WHEN** 使用production preview和脱敏fixture在1440/390验证受影响代表页面
- **THEN** 数值单位、商品卡/省略、订单/购物车/付款状态与Feishu折叠交互 SHALL 可用且页面级overflow为0
- **AND** 非预期console、pageerror和requestfailed SHALL 为0
- **AND** 验证 SHALL NOT 连接60、真实支付、真实企业账号、凭据或摄像头
