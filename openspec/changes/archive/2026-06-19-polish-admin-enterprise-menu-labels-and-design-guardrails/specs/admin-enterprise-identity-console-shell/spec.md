## ADDED Requirements

### Requirement: 企业认证中心一级菜单命名门禁
Admin 企业认证中心 Shell SHALL 保持一级导航标签简洁、面向业务域且受测试门禁保护。常规中文一级菜单标签 MUST 使用四个中文字符，`LLM AI/Gateway` 等专有技术词 MAY 通过显式 allowlist 保留；没有明确产品例外时，新的抽象“中心/工作台/任务中心/快捷入口”式一级入口 SHALL NOT 被新增。

#### Scenario: 中文一级菜单使用四字业务名
- **WHEN** 管理员使用中文界面打开桌面侧栏或组织导航配置树
- **THEN** 每个常规中文一级分组标签 SHALL 正好包含四个中文字符
- **AND** `LLM AI/Gateway` 等允许保留的专有技术标签 SHALL 记录在导航测试 allowlist 中

#### Scenario: 一级菜单不新增抽象入口
- **WHEN** 后续 change 新增或重命名 Admin 企业认证中心一级导航分组
- **THEN** 如果标签引入泛化中心、工作台、任务中心或快捷入口等明显抽象主入口命名，导航测试 SHALL 失败
- **AND** 跨域能力默认 SHALL 通过总览状态、对象上下文、抽屉、工具栏动作、向导步骤或兼容 deep link 继续可达

#### Scenario: 配置树和运行时侧栏保持一致
- **WHEN** 管理员查看 organization `navItems` / `userNavItems` configuration tree
- **THEN** 配置树 SHALL 暴露与运行时侧栏一致的一级菜单标签集合
- **AND** 一级标签调整后，route key、叶子 key 和权限过滤 SHALL 保持稳定
