const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createGatewayProjectionControlledSmokePreflightHandoff,
} = require("./gatewayProjectionControlledSmokePreflightHandoff");

function adminRelease(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready-for-controlled-smoke",
    aliases: [],
    ownerHandoffs: [{
      alias: "ready_for_controlled_smoke",
      owner: "admin_operator",
      nextAction: "只进入受控 smoke 准备",
      minimumUnblockCondition: "Admin release decision evidence 已检查且无 blocking alias",
    }],
    minimumUnblockConditions: [{
      alias: "ready_for_controlled_smoke",
      owner: "admin_operator",
      condition: "Admin release decision evidence 已检查且无 blocking alias",
    }],
    ...overrides,
  };
}

function adminReadiness(overrides = {}) {
  return {
    status: "ok",
    aliases: [],
    mappingReadiness: {
      status: "ok",
      counts: {
        active_publishable: 1,
        mapping_missing: 0,
        mapping_untrusted: 0,
      },
    },
    handoffs: [],
    ...overrides,
  };
}

function apiDiagnostics(overrides = {}) {
  return {
    status: "ok",
    decision: "ready",
    aliases: [],
    ownerHandoffs: [{
      alias: "api_diagnostics_clear",
      owner: "api_diagnostics_owner",
      minimumUnblockCondition: "API diagnostics decision evidence 已检查且无 blocking alias",
    }],
    ...overrides,
  };
}

test("returns not-checked when required evidence is missing", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({});

  assert.equal(handoff.status, "not_checked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.decision, "not-checked");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("read-only"), true);
});

test("fails closed and does not echo sensitive input", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({
    adminReleaseDecisionHandoff: adminRelease(),
    adminReadinessSummary: adminReadiness(),
    apiDiagnosticsDecision: apiDiagnostics({
      rawResponse: {
        token: "secret-value",
        email: "alice@example.invalid",
      },
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.decision, "blocked-by-contract-or-redaction");
  assert.deepEqual(handoff.aliases, ["sanitization_failed"]);
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
  assert.equal(JSON.stringify(handoff).includes("alice@example.invalid"), false);
});

test("blocks on API diagnostics decision evidence", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({
    adminReleaseDecisionHandoff: adminRelease(),
    adminReadinessSummary: adminReadiness(),
    apiDiagnosticsDecision: apiDiagnostics({
      status: "blocked",
      decision: "blocked-by-api-ingestion-diagnostics",
      aliases: ["api_projection_diagnostics_stale"],
      ownerHandoffs: [{
        alias: "api_projection_diagnostics_stale",
        owner: "api_diagnostics_owner",
        minimumUnblockCondition: "API owner 提供脱敏 diagnostics decision clear evidence",
      }],
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.decision, "blocked-by-api-diagnostics");
  assert.equal(handoff.localBlockerCategory, "api_diagnostics_blocked");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "api_diagnostics_owner"), true);
});

test("blocks source freshness separately from generic Admin release decision", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({
    adminReleaseDecisionHandoff: adminRelease(),
    adminReadinessSummary: adminReadiness({
      status: "blocked",
      aliases: ["source_connection_stale"],
      handoffs: [{
        alias: "source_connection_stale",
        owner: "admin_source_owner",
        minimumUnblockCondition: "source freshness 恢复 fresh",
      }],
    }),
    apiDiagnosticsDecision: apiDiagnostics(),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.decision, "blocked-by-admin-source-freshness");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_source_owner"), true);
});

test("blocks mapping readiness without suggesting display or legacy join keys", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({
    adminReleaseDecisionHandoff: adminRelease(),
    adminReadinessSummary: adminReadiness({
      status: "blocked",
      aliases: ["mapping_missing"],
      handoffs: [{
        alias: "mapping_missing",
        owner: "admin_mapping_operator",
        minimumUnblockCondition: "存在 confirmed PlatformApiUserMapping.ApiUserId",
      }],
    }),
    apiDiagnosticsDecision: apiDiagnostics(),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.decision, "blocked-by-mapping-readiness");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_mapping_operator"), true);
  assert.equal(handoff.boundaries.some(item => item.includes("display name")), true);
});

test("blocks generic Admin release decision evidence", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({
    adminReleaseDecisionHandoff: adminRelease({
      status: "blocked",
      release: "hold",
      decision: "blocked-by-contract-or-config",
      aliases: ["environment_deploy_stale"],
      ownerHandoffs: [{
        alias: "environment_deploy_stale",
        owner: "admin_deploy_owner",
        minimumUnblockCondition: "部署 current observability shape",
      }],
    }),
    adminReadinessSummary: adminReadiness(),
    apiDiagnosticsDecision: apiDiagnostics(),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.decision, "blocked-by-admin-release-decision");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_deploy_owner"), true);
});

test("returns ready-for-controlled-smoke-prep only for checked clear evidence", () => {
  const handoff = createGatewayProjectionControlledSmokePreflightHandoff({
    adminReleaseDecisionHandoff: adminRelease(),
    adminReadinessSummary: adminReadiness(),
    apiDiagnosticsDecision: apiDiagnostics(),
  }, {
    generatedAt: "2026-06-13T11:30:00.000Z",
    sourceAlias: "local-dry-run",
  });

  assert.equal(handoff.status, "ready");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.decision, "ready-for-controlled-smoke-prep");
  assert.equal(handoff.localBlockerCategory, "none");
  assert.equal(handoff.generatedAt, "2026-06-13T11:30:00.000Z");
  assert.equal(handoff.sourceAlias, "local-dry-run");
  assert.equal(handoff.doNotDispatchUntil.includes("受控 smoke 准备"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.boundaries.some(item => item.includes("不是真实 publish 成功")), true);
});
