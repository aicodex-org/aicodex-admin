## MODIFIED Requirements

### Requirement: Web3 专属实现和依赖按 owner 清退
Admin SHALL 删除 Web3Auth、MetaMask/Web3Onboard idp 工厂和仅由钱包认证持有的依赖，同时 SHALL 保留仍有其它业务 owner 的兼容依赖、历史展示能力和不依赖 SDK 的 bounded token cleanup。

#### Scenario: 安装前端依赖
- **WHEN** 使用Bun标准入口安装 `web-admin`
- **THEN** `@metamask/eth-sig-util`、直接 `@web3-onboard/*`、`ethers`及其Web3专属传递树 SHALL 不再出现
- **AND** `bluebird`若基线不存在 SHALL NOT 因本change被新增
- **AND** 唯一tracked `bun.lock` SHALL 保持完整且可复现

#### Scenario: 保留其它 owner
- **WHEN** 构建普通登录、密码混淆、历史头像和mixed CommonJS功能
- **THEN** `buffer`、`react-metamask-avatar`及有非Web3 owner的Vite/CommonJS兼容 SHALL 保持可用
- **AND** 本change SHALL NOT 为追求lock清零而删除这些依赖

### Requirement: 退役交付使用脱敏存量和回归证据
Web3 钱包认证清退只有在目标环境真实存量可被只读聚合证明为零、实施门禁通过且归档前 review READY 时 SHALL 自收口；证据 SHALL 分层并保持脱敏。

#### Scenario: 目标环境存量非零或不可判断
- **WHEN** Provider、Application binding、用户钱包值或可识别真实审计引用任一非零，或查询不能可靠区分空字段key与真实值
- **THEN** change SHALL 停止破坏性代码/依赖清退并标记 `BLOCKED`
- **AND** 截图或页面未展示 SHALL NOT 替代数据证据

#### Scenario: 记录只读存量门禁
- **WHEN** 验证记录描述受控环境盘点
- **THEN** 只 SHALL 记录命名聚合计数、只读事务和未修改环境状态的结论
- **AND** 记录 SHALL NOT 包含账号、地址、token、Cookie、password、DSN、完整私有URL、raw row或raw audit payload

#### Scenario: 浏览器和自动化回归
- **WHEN** change准备pre-archive review
- **THEN** 聚焦Vitest/Go contract、changed implementation coverage、前端完整质量门禁和OpenSpec strict SHALL 通过
- **AND** Playwright discovery SHALL 保持19 files/22 tests，相关浏览器smoke SHALL 证明无Web3入口、无白屏且page/console error为0
