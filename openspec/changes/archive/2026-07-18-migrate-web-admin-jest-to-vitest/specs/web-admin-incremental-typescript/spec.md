## MODIFIED Requirements

### Requirement: TypeScript稳态验证命令遵循Bun单一真值
Bun采用后，增量TypeScript主规格中仍代表当前标准执行入口的验证命令 SHALL 使用 `bun run <script>`或等价Bun入口；Vitest采用后，当前标准单元测试入口 SHALL 使用Vitest而不是Jest或`bun test`。历史交付要求中的验证层级 SHALL 保留，但已归档change中的历史命令 SHALL 保持原始证据，不作为活动Yarn或Jest runner真值。

#### Scenario: 归档同步TypeScript主规格
- **WHEN** 本change完成sync-specs归档
- **THEN** 主规格中仍代表当前标准入口的Yarn命令字面量 SHALL 全部迁移为Bun runner
- **AND** 当前单元测试runner SHALL 为Vitest且不得保留Jest/Vitest双runner
- **AND** typecheck、build-tooling、incremental gate、单元测试、coverage、build与浏览器验证层级 SHALL 不因runner迁移被删除或降级
