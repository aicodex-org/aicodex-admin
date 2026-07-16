## ADDED Requirements

### Requirement: React 18 测试异步提交保持可审计
`web-admin` 的 React 测试 SHALL 在断言和 cleanup 前等待由交互触发的 promise、DOM 状态、microtask 或 timer 完成条件。测试 SHALL NOT 通过全局或局部 warning suppression、空 `act`、任意 sleep、提高 timeout 或 legacy ReactDOM 隐藏未完成更新。

#### Scenario: 等待异步用户交互完成
- **WHEN** 测试触发 backend request、class state、portal、motion、lazy import 或其它异步 React 更新
- **THEN** 测试 SHALL 使用 `findBy`、`waitFor`、await 交互、可捕获 promise 或具有实际推进目标的 `act` 等待用户可观察状态稳定
- **AND** 测试结束时治理 owner SHALL NOT 输出 `not wrapped in act` warning

#### Scenario: 局部诊断 guard 不静默 console
- **WHEN** 测试使用局部 guard 防止 act warning 回退
- **THEN** guard SHALL 保留原始 `console.error` / `console.warn` 行为并在断言后恢复 spy
- **AND** guard SHALL NOT 按 warning 文本返回、吞掉 AntD/runtime warning 或写入 Jest 全局 setup/config

### Requirement: fake timer 只推进其拥有的异步任务
使用 Jest fake timers 的测试 SHALL 在创建目标 timer 前启用 fake timers，在 `act` 中推进与断言相关的 timer 和后续 microtask，并在完成后恢复 real timers。测试 SHALL NOT 用 fake timer API 清理 native timer，也 SHALL NOT 通过全局 timer cleanup 改变其它 suite 语义。

#### Scenario: 轮询测试推进并恢复 timer
- **WHEN** 测试验证 polling、debounce、interval 或 timeout 行为
- **THEN** fake timer SHALL 在目标 timer 创建前启用
- **AND** timer 推进与后续 React 提交 SHALL 在断言前完成
- **AND** suite 结束时 SHALL 不输出 FakeTimers/native timer 提示
