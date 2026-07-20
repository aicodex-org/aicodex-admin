## MODIFIED Requirements

### Requirement: web-admin 全量 Vitest 基线稳定
仓库 SHALL 提供可重复执行的non-watch Vitest入口，并且当前提交的全部 `web-admin` unit suite SHALL 在默认单测timeout、single-worker、file-serial模式下通过。性能候选只有在两次连续默认顺序、固定file-only shuffle与coverage门禁全部通过时才能替换公共runner；任一重复轮失败 SHALL 回退为当前未优化runner，不得把单次完整绿灯或聚焦专项当成采用证据。

#### Scenario: 本地执行当前全量 CI 测试
- **WHEN** 开发者在 `web-admin`目录执行 `bun run test:ci`
- **THEN** Vitest SHALL 以non-watch、single-worker、file-serial模式完成全部已提交suite
- **AND** SHALL 发现全部157条规范化测试路径、执行不少于1510个test且0 failure
- **AND** 结果 SHALL 不包含timeout、unhandled error或0-test success

#### Scenario: 第二次默认轮失败保持公共真值
- **WHEN** dependency optimizer候选第一次默认完整通过、但第二次默认轮出现范围外timeout并回退
- **THEN** 候选 SHALL NOT宣称完成重复correctness、shuffle或coverage门禁
- **AND** 当前未优化runner的157路径、测试数与coverage reporter真值 SHALL 保持owner
- **AND** 删除测试、skip/only、exclude、扩大mock或`passWithNoTests` SHALL 继续阻止release candidate

### Requirement: non-silent Vitest 审计治理后的异步 warning
测试异步边界change和runner性能评估 SHALL 使用固定test环境、non-silent、非watch、单worker、文件串行的Vitest，对React act、FakeTimers/native timer、multiple React renderers、AntD/runtime和其它console warning分类。候选重复默认NO-GO时，verification SHALL 区分首次通过与第二次失败，不提交原始长日志。

#### Scenario: 单次完整绿灯不能替代重复warning门禁
- **WHEN** optimizer候选的module graph专项与第一次默认完整轮通过，但第二次默认顺序出现范围外timeout
- **THEN** 公共runner SHALL 保持当前未优化配置
- **AND** 专项与首次成功 SHALL 只证明对应轮次和module graph边界，不证明重复correctness、shuffle或coverage完成
- **AND** warning SHALL NOT因新增suppression或候选回退而被错误宣称消失

## ADDED Requirements

### Requirement: 测试性能候选必须在批准owner范围内fail-closed
测试runner性能change SHALL 在proposal/design中列出可修改owner上限。若重复完整候选出现范围外owner、production需求、新依赖、mock/interop/singleton破坏或coverage报告不完整，实现 SHALL 停止扩大写集并回退公共runner；不得通过提高timeout、sleep、删测、扩大业务mock或warning suppression制造采用结果。

#### Scenario: 第二次默认出现批准范围外timeout owner
- **WHEN** 第二次默认完整候选在批准owner列表之外的 `ApplicationEditPageUiCustomization.test.tsx` 出现默认5秒timeout
- **THEN** 候选 SHALL 立即NO-GO并停止shuffle与coverage
- **AND** 范围外owner与production SHALL 不被修改
- **AND** 候选config、直接契约与条件式owner修改 SHALL 回退到实施前状态
- **AND** verification SHALL 记录失败case、性能、资源、warning与未执行门禁

#### Scenario: 未来重新评估optimizer
- **WHEN** 后续change再次评估AntD/icons dependency optimizer或Vitest大版本
- **THEN** change SHALL 重新定义包含实际长尾的owner写集与资源锁
- **AND** SHALL 专项回归 `vi.mock("antd")`、`vi.importActual("antd")`、`vi.mock("antd/es/*")`与singleton状态
- **AND** SHALL 完成两次默认、file-only shuffle、coverage与warning门禁后才能采用
