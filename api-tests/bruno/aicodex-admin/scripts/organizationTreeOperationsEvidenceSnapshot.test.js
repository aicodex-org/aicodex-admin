const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createOrganizationTreeOperationsEvidenceSnapshot,
} = require("./organizationTreeOperationsEvidenceSnapshot");

function diagnostics(overrides = {}) {
  return {
    status: "ok",
    data: {
      summary: {
        orgVersion: "org-v-redacted",
        freshness: "fresh",
        generatedAt: "2026-06-13T00:00:00Z",
        readModelSource: "platform_department",
        lineage: {available: true, sourceVersion: "source-v-redacted"},
        nodeCount: 2,
        visibleNodeCount: 2,
        filteredNodeCount: 0,
        sourceConnectionSummary: {
          total: 1,
          statusCounts: {ENABLED: 1},
          freshnessCounts: {FRESH: 1},
          hasStaleFreshness: false,
          hasUnavailableFreshness: false,
          hasUnknownFreshness: false,
        },
      },
      nodes: [{id: "dept-redacted"}],
      diagnostics: [],
      sourceConnections: [{status: "ENABLED", freshness: "FRESH"}],
      ...overrides.data,
    },
    ...overrides,
  };
}

function refreshStatus(overrides = {}) {
  return {
    status: "ok",
    data: {
      triggerType: "refresh_status",
      status: "ok",
      traceId: "trace-redacted",
      diagnostics: {summary: diagnostics().data.summary},
      ...overrides.data,
    },
    ...overrides,
  };
}

test("creates a minimal ready evidence snapshot without raw tree details", () => {
  const snapshot = createOrganizationTreeOperationsEvidenceSnapshot({
    diagnosticsResponse: diagnostics(),
    refreshStatusResponse: refreshStatus(),
    organizationTreeResponse: {status: "ok", data: {nodes: [{id: "dept-redacted"}]}},
  }, {
    requireNonEmptyTree: true,
    requireRefreshStatus: true,
    requireTreeResponse: true,
    generatedAt: "2026-06-13T08:00:00.000Z",
  });

  assert.equal(snapshot.status, "ready");
  assert.deepEqual(snapshot.aliases, []);
  assert.equal(snapshot.evidence.generatedAt, "2026-06-13T08:00:00.000Z");
  assert.equal(snapshot.evidence.summaryStatus, "ready");
  assert.equal(snapshot.evidence.checkStatuses.nonEmptyTree, "ready");
  assert.equal(snapshot.evidence.counts.nodeCount, 2);
  assert.deepEqual(snapshot.minimumUnblockConditions, []);
  assert.equal(snapshot.boundaries.some((item) => item.includes("subjectCount>=1")), true);
  assert.equal(JSON.stringify(snapshot).includes("dept-redacted"), false);
});

test("keeps blocked aliases, handoff, and minimum unblock conditions", () => {
  const snapshot = createOrganizationTreeOperationsEvidenceSnapshot({
    diagnosticsResponse: diagnostics({
      data: {
        nodes: [],
        summary: {...diagnostics().data.summary, nodeCount: 0},
      },
    }),
  }, {
    requireNonEmptyTree: true,
    requireRefreshStatus: true,
  });

  assert.equal(snapshot.status, "blocked");
  assert.equal(snapshot.aliases.includes("empty_tree"), true);
  assert.equal(snapshot.aliases.includes("refresh_status_unavailable"), true);
  assert.equal(snapshot.minimumUnblockConditions.some((item) => item.alias === "empty_tree"), true);
  assert.equal(snapshot.handoffs.some((item) => item.owner === "fixture_owner"), true);
});

test("fails closed for raw body, private URL, and account-like fields", () => {
  const snapshot = createOrganizationTreeOperationsEvidenceSnapshot({
    diagnosticsResponse: diagnostics({
      data: {
        rawBody: "{\"status\":\"ok\",\"token\":\"<redacted-sensitive-value>\"}",
        endpoint: "https://<admin-base-url>/api/organization-tree-operations/diagnostics",
        accountName: "redacted-account",
      },
    }),
  });

  assert.equal(snapshot.status, "blocked");
  assert.deepEqual(snapshot.aliases, ["organization_tree_evidence_sanitization_failed"]);
  assert.equal(snapshot.checks.sanitization.reason, "sensitive_or_raw_evidence_input_present");
  assert.equal(JSON.stringify(snapshot).includes("<redacted-sensitive-value>"), false);
  assert.equal(JSON.stringify(snapshot).includes("<admin-base-url>"), false);
});

test("fails closed for complete organization tree node lists", () => {
  const snapshot = createOrganizationTreeOperationsEvidenceSnapshot({
    diagnosticsResponse: diagnostics({data: {nodes: []}}),
    organizationTreeResponse: {
      status: "ok",
      data: {
        nodes: [
          {id: "dept-1", name: "研发部", parentId: null, children: [{id: "dept-2", name: "平台组"}]},
          {id: "dept-2", name: "平台组", parentId: "dept-1", path: "/研发部/平台组"},
        ],
      },
    },
  });

  assert.equal(snapshot.status, "blocked");
  assert.deepEqual(snapshot.aliases, ["organization_tree_evidence_sanitization_failed"]);
  assert.equal(JSON.stringify(snapshot).includes("研发部"), false);

  const singleRootSnapshot = createOrganizationTreeOperationsEvidenceSnapshot({
    diagnosticsResponse: diagnostics({data: {nodes: []}}),
    organizationTreeResponse: {
      status: "ok",
      data: {
        nodes: [
          {id: "dept-1", name: "总部", children: [{id: "dept-2", name: "财务部"}]},
        ],
      },
    },
  });
  assert.equal(singleRootSnapshot.status, "blocked");
  assert.deepEqual(singleRootSnapshot.aliases, ["organization_tree_evidence_sanitization_failed"]);
  assert.equal(JSON.stringify(singleRootSnapshot).includes("总部"), false);
});
