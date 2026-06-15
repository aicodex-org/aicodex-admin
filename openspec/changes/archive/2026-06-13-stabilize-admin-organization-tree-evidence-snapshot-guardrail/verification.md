# Verification

## 2026-06-13 本地无密验证

- 相关 Node 单测：通过。
  - 命令：`node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot.test.js api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 结果：13 个测试通过，覆盖 ready evidence snapshot、blocked alias、最小解除条件、完整响应体/私有 URL/账号字段 fail closed、多节点和单根完整组织树节点列表 fail closed，以及既有 smoke summary 行为。
- 脚本语法检查：通过。
  - 命令：`node --check api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot.js; node --check api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot.test.js; node --check api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.js`
- 覆盖率：通过。
  - 命令：`node --experimental-test-coverage --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot.test.js api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 统计对象：`api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot.js`
  - 结果：line 97.93%，branch 88.89%，function 100.00%，达到 85% 门槛。
- OpenSpec change 验证：通过。
  - 命令：`openspec validate stabilize-admin-organization-tree-evidence-snapshot-guardrail --strict`
- OpenSpec 主规格验证：通过。
  - 命令：`openspec validate --specs --strict`
  - 结果：14 个 spec 通过，0 个失败。
- OpenSpec active changes 验证：通过。
  - 命令：`openspec validate --changes --strict`
  - 结果：4 个 change 通过，0 个失败。
- Diff 空白检查：通过。
  - 命令：`git diff --check`

## 硬红线检查

- 未写真实 fixture。
- 未触发真实 read model 重建。
- 未查询或修改真实数据库。
- 未开启真实 gate/密钥。
- 未提交 token、Cookie、私有 URL、真实账号、完整组织树、完整诊断响应或完整来源响应体。
- 未把空树、consumer-only 或 summary/evidence snapshot 输出外推为 Admin 非空组织树运营成功。
- 未触碰 API、Insight 或 Gateway 仓库。

## 剩余风险

- 本次仅做本地无密脚本验证，没有使用真实 60 环境登录态运行 Bruno；这是硬红线约束下的预期边界。
- Evidence snapshot 不能证明 `subjectCount>=1`，也不能替代受控 60 smoke 或真实 fixture 授权。
