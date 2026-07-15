# admin-application-edit-regression-safety Specification

## Purpose
定义应用编辑页在拆分和持续维护时必须保留的回归保护、覆盖率门槛和高风险配置验证边界，确保管理员可观察的加载、校验、保存和 Tab 行为不因前端重构而回退。

## Requirements
### Requirement: 应用编辑页关键配置行为具备可执行回归保护
Admin 前端 SHALL 将应用编辑页的可独立验证规则和高风险配置路径纳入行为测试，同时保持应用详情加载、字段编辑、保存请求、错误提示和成功跳转的既有语义。

#### Scenario: 详情加载后保持配置默认值和编辑状态
- **WHEN** 管理员打开一个应用编辑路由，详情接口返回可选数组或配置字段为空的应用数据
- **THEN** 页面 SHALL 将可编辑数组规范化为安全的空集合
- **AND** 页面 SHALL 保留对应应用路由和初始未修改状态
- **AND** 页面 SHALL NOT 因空配置渲染或切换配置 Tab 而抛出错误

#### Scenario: 校验失败定位到对应配置区域
- **WHEN** 管理员提交缺失应用名称、显示名称或自定义 scope 标识的配置
- **THEN** 页面 SHALL 阻止保存请求
- **AND** 页面 SHALL 激活包含错误字段的配置 Tab 并显示对应校验提示
- **AND** 修正字段后再次提交 SHALL 使用规范化后的配置值

#### Scenario: 保存保持既有应用配置契约
- **WHEN** 管理员修改应用配置并提交，且保存接口返回成功
- **THEN** 页面 SHALL 仅发送当前应用的既有配置 payload
- **AND** 页面 SHALL 清除未保存状态并保持既有成功跳转语义
- **AND** 重复提交保护 SHALL 阻止提交中的第二次保存请求

#### Scenario: 高风险配置 Tab 保持独立可测试边界
- **WHEN** 页面渲染或编辑 Provider、SAML、安全或反向代理配置
- **THEN** 该配置的字段转换和可观察渲染结果 SHALL 能由独立模块或页面行为测试验证
- **AND** 测试 SHALL NOT 使用真实 Provider 凭据、真实认证回调或敏感环境配置

### Requirement: 应用编辑页覆盖率统计真实反映受影响实现
`ApplicationEditPage.tsx` 与本 change 新增或实质修改的应用编辑生产模块 SHALL 在完整关联回归测试集合下达到至少 85% 的行覆盖率。

#### Scenario: 运行完整关联覆盖率验证
- **WHEN** 本 change 准备归档前 review
- **THEN** 覆盖率命令 SHALL 包含所有直接引用应用编辑页或拆分模块的现有与新增回归测试
- **AND** `ApplicationEditPage.tsx` 及本 change 受影响生产模块 SHALL 分别达到至少 85% 的行覆盖率
- **AND** 验证记录 SHALL 说明统计文件、测试集合和未覆盖分支处置

#### Scenario: 覆盖率不通过统计规避获得
- **WHEN** 开发者为应用编辑页补充测试或拆分模块
- **THEN** 实现 SHALL NOT 通过排除受影响文件、只断言 mock 调用次数、删除高价值断言或移动未测试逻辑来制造达标结果
- **AND** 测试 SHALL 覆盖管理员可观察的配置结果、校验失败或保存行为
