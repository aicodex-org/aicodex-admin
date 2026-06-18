## ADDED Requirements

### Requirement: 总览横向能力降噪
Admin 企业认证中心总览 SHALL 以运行状态、待关注事项或上下文 deep link 呈现跨域能力，而不是显眼连续展示一组独立中心目录。

#### Scenario: 总览不连续堆叠抽象能力入口
- **WHEN** 已登录管理员访问 `/`
- **THEN** 待关注区域 SHALL 优先呈现身份基础设施健康度、审计/同步/应用状态以及当前最稳妥的下一步动作
- **AND** 身份资产关系、接入预检和治理任务 SHALL NOT 作为三个连续的主入口卡片或主操作标签出现
- **AND** 指向 `/identity-assets`、`/access-wizard` 和 `/governance-tasks` 的既有 deep link SHALL 以状态型文案保持可达

#### Scenario: 总览文案表达运行状态和待办摘要
- **WHEN** 总览展示对象关系、接入条件或风险队列相关信息
- **THEN** 文案 SHALL 描述证据上下文、接入条件核对或风险待办摘要
- **AND** 文案 SHALL NOT 要求管理员先理解新的独立中心概念，才能判断下一步应核对什么
