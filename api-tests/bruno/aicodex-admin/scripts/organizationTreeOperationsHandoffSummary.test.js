const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createOrganizationTreeOperationsHandoffSummary,
} = require("./organizationTreeOperationsHandoffSummary");

const baseCounts = {
  nodeCount: 2,
  visibleNodeCount: 2,
  filteredNodeCount: 0,
  sourceConnectionCount: 1,
};

function readySnapshot(overrides = {}) {
  return {
    status: "ready",
    aliases: [],
    counts: baseCounts,
    checks: {
      diagnostics: {status: "ready"},
      readModel: {status: "ready"},
      lineage: {status: "ready"},
      sourceConnection: {status: "ready"},
      nonEmptyTree: {status: "ready"},
      refreshStatus: {status: "ready"},
    },
    handoffs: [],
    minimumUnblockConditions: [],
    boundaries: [
      "evidence snapshot 不是 subjectCount>=1 证明",
      "evidence snapshot 不能替代受控 60 smoke 或真实 fixture 授权",
      "summary 只代表 Admin 组织树运营 smoke readiness，不是 API/Gateway authorization facts",
    ],
    leaseReleaseRecommendation: "release_after_report",
    ...overrides,
  };
}

function blockedSnapshot(overrides = {}) {
  return readySnapshot({
    status: "blocked",
    aliases: ["empty_tree", "refresh_status_unavailable"],
    counts: {...baseCounts, nodeCount: 0, visibleNodeCount: 0},
    checks: {
      diagnostics: {status: "ready"},
      nonEmptyTree: {status: "blocked", alias: "empty_tree", reason: "node_count_zero"},
      refreshStatus: {status: "not_checked", alias: "refresh_status_unavailable", reason: "refresh_status_response_not_provided"},
    },
    handoffs: [
      {
        alias: "empty_tree",
        owner: "fixture_owner",
        nextAction: "使用已知具备可管理组织树的测试账号或受控 fixture 后重新运行只读 summary",
        minimumUnblockCondition: "诊断或可选组织树响应能证明 Admin-owned 非空 nodes，且不依赖 consumer-only 或 Insight fallback",
      },
      {
        alias: "refresh_status_unavailable",
        owner: "admin_operator",
        nextAction: "只读调用 refresh_status 并确认返回 traceId、triggerType=refresh_status 和稳定诊断摘要",
        minimumUnblockCondition: "refresh_status 响应 status=ok，且包含 traceId 与 diagnostics.summary",
      },
    ],
    minimumUnblockConditions: [
      {
        alias: "empty_tree",
        owner: "fixture_owner",
        condition: "诊断或可选组织树响应能证明 Admin-owned 非空 nodes，且不依赖 consumer-only 或 Insight fallback",
      },
      {
        alias: "refresh_status_unavailable",
        owner: "admin_operator",
        condition: "refresh_status 响应 status=ok，且包含 traceId 与 diagnostics.summary",
      },
    ],
    leaseReleaseRecommendation: "hold_until_minimum_unblock_conditions_clear",
    ...overrides,
  });
}

test("creates a releasable handoff summary from a ready evidence snapshot", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    evidenceSnapshot: readySnapshot(),
  }, {
    generatedAt: "2026-06-13T09:00:00.000Z",
    sourceAlias: "local-dry-run",
  });

  assert.equal(handoff.status, "ready");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.localBlockerCategory, "none");
  assert.deepEqual(handoff.aliases, []);
  assert.deepEqual(handoff.minimumUnblockConditions, []);
  assert.equal(handoff.generatedAt, "2026-06-13T09:00:00.000Z");
  assert.equal(handoff.sourceAlias, "local-dry-run");
  assert.equal(handoff.counts.nodeCount, 2);
  assert.equal(handoff.boundaries.some((item) => item.includes("subjectCount>=1")), true);
  assert.equal(handoff.boundaries.some((item) => item.includes("受控 60 smoke")), true);
  assert.equal(JSON.stringify(handoff).includes("diagnostics"), false);
});

test("keeps blocked aliases, local blocker classification, and minimum unblock conditions", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    evidenceSnapshot: blockedSnapshot(),
  }, {
    generatedAt: "2026-06-13T09:05:00.000Z",
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "fixture_or_local_check_blocked");
  assert.deepEqual(handoff.aliases, ["empty_tree", "refresh_status_unavailable"]);
  assert.equal(handoff.ownerHandoffs.some((item) => item.owner === "fixture_owner"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.alias === "empty_tree"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.alias === "refresh_status_unavailable"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("empty_tree"), true);
  assert.equal(JSON.stringify(handoff).includes("node_count_zero"), false);
});

test("treats not checked evidence as a non-releasable local gate", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    summary: blockedSnapshot({
      status: "not_checked",
      aliases: ["non_empty_fixture_missing"],
      checks: {
        nonEmptyTree: {
          status: "not_checked",
          alias: "non_empty_fixture_missing",
          reason: "organization_tree_response_not_provided",
        },
      },
      handoffs: [{
        alias: "non_empty_fixture_missing",
        owner: "fixture_owner",
        nextAction: "提供受控非空组织树响应后重跑",
        minimumUnblockCondition: "受控 fixture 或测试账号证明 Admin-owned nodes 非空",
      }],
      minimumUnblockConditions: [{
        alias: "non_empty_fixture_missing",
        owner: "fixture_owner",
        condition: "受控 fixture 或测试账号证明 Admin-owned nodes 非空",
      }],
    }),
  });

  assert.equal(handoff.status, "not_checked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "local_evidence_not_checked");
  assert.deepEqual(handoff.aliases, ["non_empty_fixture_missing"]);
});

test("classifies admin source blockers and derives minimum unblock conditions from handoffs", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    summary: blockedSnapshot({
      aliases: ["source_connection_stale", "lineage_missing"],
      handoffs: [{
        alias: "source_connection_stale",
        owner: "admin_source_owner",
        nextAction: "检查 Admin-owned SourceConnection 状态、freshness、source snapshot 和同步批次",
        minimumUnblockCondition: "SourceConnection 不再 stale/disabled/unavailable/unknown，且 freshness 可判定",
      }],
      minimumUnblockConditions: [],
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.localBlockerCategory, "admin_source_or_read_model_blocked");
  assert.equal(handoff.minimumUnblockConditions[0].alias, "source_connection_stale");
  assert.equal(handoff.minimumUnblockConditions[0].owner, "admin_source_owner");
  assert.equal(handoff.doNotDispatchUntil.includes("source_connection_stale|lineage_missing"), true);
});

test("keeps unknown blocked handoffs non-releasable without inventing success", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    summary: {
      status: "blocked",
      aliases: ["unexpected_local_blocker"],
      counts: {},
      handoffs: [],
      boundaries: [],
    },
  });

  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "local_handoff_blocked");
  assert.equal(handoff.doNotDispatchUntil.includes("unexpected_local_blocker"), true);
});

test("fails closed without echoing sensitive handoff input", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    evidenceSnapshot: readySnapshot({
      operatorNote: "Bearer <redacted-sensitive-value>",
      privateUrl: "https://<admin-base-url>/api/organization-tree-operations/diagnostics",
      account: "redacted-user",
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "sanitization_failed");
  assert.deepEqual(handoff.aliases, ["organization_tree_handoff_sanitization_failed"]);
  assert.equal(handoff.ownerHandoffs[0].owner, "admin_operator");
  assert.equal(JSON.stringify(handoff).includes("<redacted-sensitive-value>"), false);
  assert.equal(JSON.stringify(handoff).includes("<admin-base-url>"), false);
  assert.equal(JSON.stringify(handoff).includes("redacted-user"), false);
});

test("fails closed when operator metadata contains a private URL", () => {
  const handoff = createOrganizationTreeOperationsHandoffSummary({
    evidenceSnapshot: readySnapshot(),
  }, {
    sourceAlias: "https://<admin-base-url>/evidence",
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["organization_tree_handoff_sanitization_failed"]);
  assert.equal(JSON.stringify(handoff).includes("<admin-base-url>"), false);
});
