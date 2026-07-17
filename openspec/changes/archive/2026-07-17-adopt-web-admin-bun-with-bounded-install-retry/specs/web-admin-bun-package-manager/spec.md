## ADDED Requirements

### Requirement: Windows可靠性门禁失败时不得采用Bun候选
本次评估候选 SHALL 只有在3个独立Windows fresh workspace均于最多5次 frozen install内形成完整依赖树时才可进入60运行态门禁。任一样本耗尽或direct dependency不完整时，评估 SHALL 结论为NO-GO，SHALL 撤销全部production候选并保持Yarn活动真值。

#### Scenario: 第一个Windows样本耗尽有界重试
- **WHEN** 固定candidate lock与空cache下的样本1连续5次frozen install均返回非零
- **AND** 最终direct manifests为71/72且缺少 `less`
- **THEN** 评估 SHALL 停止样本2/3和60运行态门禁
- **AND** SHALL NOT 提高重试上限、切换backend、手工补包或以Linux成功替代Windows门禁

#### Scenario: NO-GO历史归档
- **WHEN** controller接受Windows硬门禁失败并授权closeout
- **THEN** 最终package、lock、CI、Docker、Makefile、Playwright、local-dev和测试 SHALL 与最新Yarn基线一致
- **AND** archive SHALL 使用 `--skip-specs`
- **AND** `openspec/specs` SHALL 不创建或修改已采用Bun的主规格
