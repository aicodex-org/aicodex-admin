const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluateOrganizationTreeOperationsSmokeSummary,
} = require("./organizationTreeOperationsSmokeSummary");

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
      nodes: [
        {id: "dept-1", name: "研发部"},
        {id: "dept-2", parentId: "dept-1", name: "平台组"},
      ],
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
      diagnostics: {
        summary: diagnostics().data.summary,
      },
      ...overrides.data,
    },
    ...overrides,
  };
}

test("reports ready only for trusted non-empty admin organization tree", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics(),
    refreshStatusResponse: refreshStatus(),
  }, {
    requireNonEmptyTree: true,
    requireRefreshStatus: true,
  });

  assert.equal(summary.status, "ready");
  assert.deepEqual(summary.aliases, []);
  assert.equal(summary.checks.diagnostics.status, "ready");
  assert.equal(summary.checks.nonEmptyTree.status, "ready");
  assert.equal(summary.checks.refreshStatus.status, "ready");
  assert.equal(summary.counts.nodeCount, 2);
  assert.equal(JSON.stringify(summary).includes("研发部"), false);
  assert.equal(summary.boundaries.some(item => item.includes("Insight fallback")), true);
});

test("blocks empty tree and separates missing non-empty fixture proof", () => {
  const emptySummary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics({data: {nodes: [], summary: {...diagnostics().data.summary, nodeCount: 0}}}),
    refreshStatusResponse: refreshStatus(),
  }, {
    requireNonEmptyTree: true,
  });
  assert.equal(emptySummary.status, "blocked");
  assert.equal(emptySummary.aliases.includes("empty_tree"), true);
  assert.equal(emptySummary.handoffs.some(item => item.owner === "fixture_owner"), true);

  const notCheckedSummary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics(),
  }, {
    requireNonEmptyTree: true,
    requireTreeResponse: true,
  });
  assert.equal(notCheckedSummary.status, "not_checked");
  assert.equal(notCheckedSummary.aliases.includes("non_empty_fixture_missing"), true);
  assert.equal(notCheckedSummary.checks.nonEmptyTree.status, "not_checked");
});

test("blocks untrusted read model, consumer-only, and Insight fallback signals", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics({
      data: {
        summary: {
          ...diagnostics().data.summary,
          readModelSource: "insight_fallback",
        },
      },
    }),
    refreshStatusResponse: refreshStatus(),
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("read_model_untrusted"), true);
  assert.equal(summary.handoffs.some(item => item.owner === "admin_read_model_owner"), true);
});

test("blocks stale source connection and missing lineage with stable aliases", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics({
      data: {
        summary: {
          ...diagnostics().data.summary,
          lineage: undefined,
          sourceConnectionSummary: {
            total: 1,
            statusCounts: {ENABLED: 1},
            freshnessCounts: {STALE: 1},
            hasStaleFreshness: true,
            hasUnavailableFreshness: false,
            hasUnknownFreshness: false,
          },
        },
      },
    }),
    refreshStatusResponse: refreshStatus(),
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("source_connection_stale"), true);
  assert.equal(summary.aliases.includes("lineage_missing"), true);
  assert.equal(summary.handoffs.some(item => item.owner === "admin_source_owner"), true);
});

test("marks refresh status not checked or unavailable explicitly", () => {
  const notCheckedSummary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics(),
  });
  assert.equal(notCheckedSummary.status, "not_checked");
  assert.equal(notCheckedSummary.checks.refreshStatus.status, "not_checked");

  const blockedSummary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics(),
    refreshStatusResponse: {status: "error", data: {triggerType: "refresh_status", status: "error"}},
  }, {
    requireRefreshStatus: true,
  });
  assert.equal(blockedSummary.status, "blocked");
  assert.equal(blockedSummary.aliases.includes("refresh_status_unavailable"), true);
});

test("fails closed when inputs contain sensitive fields or values", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics({
      data: {
        token: "secret-value",
      },
    }),
  });

  assert.equal(summary.status, "blocked");
  assert.deepEqual(summary.aliases, ["sanitization_failed"]);
  assert.equal(summary.handoffs[0].owner, "admin_operator");
  assert.equal(JSON.stringify(summary).includes("secret-value"), false);
});

test("uses optional tree response and source connection list without exposing raw nodes", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics({
      data: {
        nodes: [],
        sourceConnections: [{status: "ENABLED", freshnessStatus: "FRESH"}],
        summary: {...diagnostics().data.summary, nodeCount: 0, sourceConnectionSummary: undefined},
      },
    }),
    organizationTreeResponse: {status: "ok", data: {items: [{id: "dept-redacted", name: "敏感部门名"}]}},
    refreshStatusResponse: refreshStatus(),
  }, {
    requireNonEmptyTree: true,
    requireTreeResponse: true,
    requireRefreshStatus: true,
  });

  assert.equal(summary.status, "ready");
  assert.equal(summary.checks.nonEmptyTree.status, "ready");
  assert.equal(JSON.stringify(summary).includes("敏感部门名"), false);
});

test("blocks invalid diagnostics and missing required refresh response", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: {status: "error"},
  }, {
    requireRefreshStatus: true,
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("read_model_untrusted"), true);
  assert.equal(summary.aliases.includes("refresh_status_unavailable"), true);
});

test("blocks stale source connection from list when summary counts are unavailable", () => {
  const summary = evaluateOrganizationTreeOperationsSmokeSummary({
    diagnosticsResponse: diagnostics({
      data: {
        summary: {...diagnostics().data.summary, sourceConnectionSummary: undefined},
        sourceConnections: [{sourceConnectionStatus: "ENABLED", freshnessStatus: "UNAVAILABLE"}],
      },
    }),
    refreshStatusResponse: refreshStatus(),
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("source_connection_stale"), true);
});
