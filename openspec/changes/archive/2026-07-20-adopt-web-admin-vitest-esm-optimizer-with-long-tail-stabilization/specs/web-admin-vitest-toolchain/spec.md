## MODIFIED Requirements

### Requirement: 开发与 CI 入口保持串行且 non-silent
`web-admin` SHALL 提供Vitest watch开发入口和确定性的 `vitest run` CI入口。公共runner SHALL 使用单worker、文件串行、非concurrent case语义，并 SHALL 保持console warning可见。`adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization`评估的AntD/icons exact-root optimizer在第二次默认完整轮出现范围外timeout而未采用；当前runner SHALL NOT启用该optimizer、测试根alias、额外workers或timeout覆盖。

#### Scenario: CI运行当前串行Vitest
- **WHEN** CI或开发者执行 `bun run test:ci`
- **THEN** Vitest SHALL 使用非watch、单worker和文件串行配置执行全部suite
- **AND** 单文件内测试 SHALL 保持 `sequence.concurrent=false`
- **AND** config SHALL 保持 `globals=false`、`isolate=true`与`mockReset=true`
- **AND** 命令 SHALL 不包含 `--silent`、`--passWithNoTests`、并行覆盖参数或timeout提升

#### Scenario: 重复默认失败的optimizer不进入runner
- **WHEN** review当前Vitest config、package scripts与CI入口
- **THEN** AntD/icons测试专用ESM root alias与 `test.deps.optimizer.client` SHALL 不存在
- **AND** 第一次完整绿灯、module graph专项或设计profiling SHALL NOT被解释为公共runner已采用
- **AND** 未来重新采用 SHALL 通过独立change扩展明确owner写集并完成两次默认、shuffle、coverage与warning门禁

### Requirement: React 18 异步 warning 保持可见
Vitest全量与聚焦运行 SHALL 保持React act、FakeTimers/native timer、multiple React renderers、AntD/runtime与其它console warning的原始可见性。性能候选在重复correctness完成前失败时 SHALL 记录完整失败轮warning口径并停止采用，SHALL NOT使用setup/config suppression、按文本吞错、空 `act`、任意sleep或提高timeout隐藏未完成更新。

#### Scenario: NO-GO候选的warning口径
- **WHEN** 性能候选第二次默认完整轮因范围外timeout fail-closed
- **THEN** verification SHALL 记录该轮完整warning分类、failure、wall与资源结果
- **AND** act、FakeTimers/native timer、multiple renderers或unhandled若出现 SHALL 继续阻止采用
- **AND** 公共runner的non-silent配置与既有warning真值 SHALL 保持不变
