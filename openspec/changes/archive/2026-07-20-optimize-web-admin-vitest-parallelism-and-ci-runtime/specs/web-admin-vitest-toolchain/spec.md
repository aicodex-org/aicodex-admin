## MODIFIED Requirements

### Requirement: 开发与 CI 入口保持串行且 non-silent
`web-admin` SHALL 提供Vitest watch开发入口和确定性的 `vitest run` CI入口。公共runner SHALL 使用单worker、文件串行、非concurrent case语义，并 SHALL 保持console warning可见。`optimize-web-admin-vitest-parallelism-and-ci-runtime`评估的AntD/icons exact-root dependency optimizer因完整默认顺序出现范围外timeout而未采用；当前runner SHALL NOT启用该optimizer、测试root alias、额外workers或timeout覆盖。

#### Scenario: CI运行当前串行Vitest
- **WHEN** CI或开发者执行 `bun run test:ci`
- **THEN** Vitest SHALL 使用非watch、单worker和文件串行配置执行全部suite
- **AND** 单文件内测试 SHALL 保持 `sequence.concurrent=false`
- **AND** config SHALL 保持 `globals=false`、`isolate=true`与`mockReset=true`
- **AND** 命令 SHALL 不包含 `--silent`、`--passWithNoTests`、并行覆盖参数或timeout提升

#### Scenario: 已拒绝optimizer不进入runner
- **WHEN** review当前Vitest config、package scripts与CI入口
- **THEN** AntD/icons测试专用ESM root alias与 `test.deps.optimizer.client` SHALL 不存在
- **AND** 设计阶段或局部专项的性能结果 SHALL NOT 被解释为公共runner已采用
- **AND** 未来重新采用 SHALL 通过独立change重新定义owner写集并完成普通全量、shuffle与coverage

### Requirement: React 18 异步 warning 保持可见
Vitest全量与聚焦运行 SHALL 保持React act、FakeTimers/native timer、AntD/runtime与其它console warning的原始可见性。性能候选在普通correctness完成前失败时 SHALL 记录部分warning口径并停止采用，SHALL NOT 使用setup/config suppression、按文本吞错、空 `act`、任意sleep或提高timeout隐藏未完成更新。

#### Scenario: NO-GO候选的warning口径
- **WHEN** 性能候选因范围外timeout在完整运行结束前fail-closed
- **THEN** verification SHALL 明确warning计数只是部分结果，不与完整基线直接比较
- **AND** act、FakeTimers/native timer或unhandled若出现 SHALL 立即阻止采用
- **AND** 公共runner的non-silent配置与既有完整warning真值 SHALL 保持不变
