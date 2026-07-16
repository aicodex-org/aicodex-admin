## ADDED Requirements

### Requirement: non-silent Jest 审计治理后的异步 warning
测试异步边界 change SHALL 使用固定 test 环境、non-silent、非 watch、`--runInBand` 全量 Jest 对 React act、FakeTimers/native timer、AntD/runtime 和其它 console warning 分类。验证记录 SHALL 只保留脱敏计数、top owner 和处理结论，不提交原始长日志。

#### Scenario: 对照治理前后 warning
- **WHEN** 开发者完成 React 18 测试异步边界治理并运行 non-silent 全量 Jest
- **THEN** 全部已发现 suite/test SHALL 以 0 failure 完成且 discovery SHALL 不低于变更前最新基线
- **AND** 治理 owner 的 act warning 与 FakeTimers/native timer 提示 SHALL 为 0
- **AND** 第三方或生产 owner 的保留 warning SHALL 按类别说明，不得因新增 suppression 消失

#### Scenario: 单 suite 绿灯不能替代跨 suite 泄漏验证
- **WHEN** 某个 owner 单独运行时 warning 为 0，但完整串行运行暴露卸载后 promise、timer 或 React 更新
- **THEN** change SHALL 以相邻 suite 或完整 non-silent 运行建立 RED/GREEN 证据
- **AND** SHALL NOT 把单 suite 退出前未触发的 warning 解释为异步边界已完成
