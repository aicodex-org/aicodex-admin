## ADDED Requirements

### Requirement: 生产 TypeScript 源码禁止字符串代码执行
Web Admin 自有 production `src/**/*.ts(x)` SHALL NOT 使用 direct `eval` 或 `Function` 构造器执行运行时字符串代码。自动化契约 SHALL 基于语法结构检查 production 源码，不得通过 console suppression、字符串替换或放宽扫描范围制造通过。

#### Scenario: production 源码保持 CSP-safe 执行边界
- **WHEN** 自动化测试扫描 Web Admin 自有 production TypeScript 与 TSX 源码
- **THEN** direct `eval` 调用计数 SHALL 为 0
- **AND** `Function(...)` 与 `new Function(...)` 字符串构造计数 SHALL 为 0

#### Scenario: 注释与普通字符串不被误判为执行入口
- **WHEN** 源码包含讨论 `eval` 或 `Function` 的注释、字符串或非调用属性名
- **THEN** 语法契约 SHALL 只报告真实 direct call 或 constructor expression

### Requirement: 未使用的宽松对象执行入口被移除
Web Admin SHALL NOT 导出或维护零调用的 `Setting.parseObject` 动态执行入口，并 SHALL 保持支持中的 `parseJson` 标准 JSON 语义不变。

#### Scenario: 删除零调用动态解析器
- **WHEN** 全仓源码与测试盘点 `parseObject`
- **THEN** SHALL 不存在定义或调用引用
- **AND** SHALL 不新增 JSON5、兼容 shim 或其它动态执行替代物

#### Scenario: 标准 JSON 解析行为保持不变
- **WHEN** 调用 `parseJson` 处理空串、合法 JSON 或非法 JSON
- **THEN** 空串 SHALL 返回 `null`
- **AND** 合法 JSON SHALL 返回标准解析结果
- **AND** 非法 JSON SHALL 继续抛出解析异常

### Requirement: 生产构建不输出 direct-eval 安全告警
Web Admin production build SHALL 在未屏蔽构建诊断的前提下完成，并 SHALL NOT 输出由项目自有源码产生的 direct-eval `[EVAL]` warning。

#### Scenario: Vite production build 验证
- **WHEN** 使用仓库标准 `yarn build` 构建 Web Admin
- **THEN** 构建 SHALL 成功
- **AND** 输出中的 direct-eval `[EVAL]` warning 计数 SHALL 为 0
- **AND** 其它既有 warning SHALL 分类记录，不得被误报为本 capability 已治理
