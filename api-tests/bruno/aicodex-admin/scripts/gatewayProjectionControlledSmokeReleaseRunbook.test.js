const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeReleaseRunbook;
try {
  ({
    createGatewayProjectionControlledSmokeReleaseRunbook,
  } = require("./gatewayProjectionControlledSmokeReleaseRunbook"));
} catch {
  createGatewayProjectionControlledSmokeReleaseRunbook = () => ({
    status: "missing_module",
    reason: "gatewayProjectionControlledSmokeReleaseRunbook_not_implemented",
  });
}

function releaseHandoff(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready-for-controlled-smoke",
    aliases: [],
    ownerHandoffs: [{
      alias: "ready_for_controlled_smoke",
      owner: "admin_operator",
      minimumUnblockCondition: "release decision evidence 已检查且无 blocking alias",
    }],
    ...overrides,
  };
}

function preflightHandoff(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready-for-controlled-smoke-prep",
    aliases: [],
    ownerHandoffs: [{
      alias: "ready_for_controlled_smoke_prep",
      owner: "admin_operator",
      minimumUnblockCondition: "controlled smoke preflight evidence 已检查且无 blocking alias",
    }],
    ...overrides,
  };
}

function evidenceSummary(overrides = {}) {
  return {
    releaseDecisionAlias: "ready-for-controlled-smoke",
    preflightAlias: "ready-for-controlled-smoke-prep",
    sourceAlias: "local-dry-run",
    evidenceHints: [{
      sourceAlias: "admin-release",
      status: "ready",
      decision: "ready-for-controlled-smoke",
      alias: "ready_for_controlled_smoke",
      owner: "admin_operator",
    }],
    ...overrides,
  };
}

test("returns ready runbook only for sanitized release and preflight evidence", () => {
  const runbook = createGatewayProjectionControlledSmokeReleaseRunbook({
    releaseDecisionAlias: "ready-for-controlled-smoke",
    controlledSmokePreflightAlias: "ready-for-controlled-smoke-prep",
    releaseDecisionHandoff: releaseHandoff(),
    controlledSmokePreflightHandoff: preflightHandoff(),
    evidenceSummary: evidenceSummary(),
  }, {
    generatedAt: "2026-06-13T12:30:00.000Z",
  });

  assert.equal(runbook.status, "ready");
  assert.equal(runbook.reason, "controlled_smoke_release_runbook_ready");
  assert.equal(runbook.generatedAt, "2026-06-13T12:30:00.000Z");
  assert.equal(runbook.operatorNextActions.some(item => item.includes("受控 smoke 准备")), true);
  assert.equal(runbook.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(runbook.boundaries.some(item => item.includes("不是真实 publish 成功")), true);
});

test("blocks when release decision or preflight prerequisites are missing", () => {
  const runbook = createGatewayProjectionControlledSmokeReleaseRunbook({
    releaseDecisionHandoff: releaseHandoff(),
  });

  assert.equal(runbook.status, "blocked");
  assert.equal(runbook.reason, "controlled_smoke_release_runbook_prerequisite_missing");
  assert.equal(runbook.missingPrerequisites.includes("release_decision_alias_missing"), true);
  assert.equal(runbook.missingPrerequisites.includes("controlled_smoke_preflight_alias_missing"), true);
  assert.equal(runbook.operatorNextActions.some(item => item.includes("只读脱敏")), true);
});

test("blocks hard red-line signals without echoing sensitive evidence", () => {
  const runbook = createGatewayProjectionControlledSmokeReleaseRunbook({
    releaseDecisionAlias: "ready-for-controlled-smoke",
    controlledSmokePreflightAlias: "ready-for-controlled-smoke-prep",
    releaseDecisionHandoff: releaseHandoff(),
    controlledSmokePreflightHandoff: preflightHandoff(),
    evidenceSummary: evidenceSummary({
      operatorNote: "trigger real publish after report",
      token: "secret-value",
      email: "alice@example.invalid",
    }),
  });

  assert.equal(runbook.status, "blocked");
  assert.equal(runbook.reason, "controlled_smoke_release_runbook_red_line_blocked");
  assert.equal(runbook.hardRedLineFlags.includes("real_environment_write_signal"), true);
  assert.equal(runbook.hardRedLineFlags.includes("sanitization_failed"), true);
  assert.equal(JSON.stringify(runbook).includes("secret-value"), false);
  assert.equal(JSON.stringify(runbook).includes("alice@example.invalid"), false);
});

test("blocks full-success overclaim even when aliases are otherwise ready", () => {
  const runbook = createGatewayProjectionControlledSmokeReleaseRunbook({
    releaseDecisionAlias: "ready-for-controlled-smoke",
    controlledSmokePreflightAlias: "ready-for-controlled-smoke-prep",
    releaseDecisionHandoff: releaseHandoff(),
    controlledSmokePreflightHandoff: preflightHandoff(),
    evidenceSummary: evidenceSummary({
      operatorNote: "mark gateway projection full-success and authorization facts success",
    }),
  });

  assert.equal(runbook.status, "blocked");
  assert.equal(runbook.reason, "controlled_smoke_release_runbook_red_line_blocked");
  assert.equal(runbook.hardRedLineFlags.includes("full_success_overclaim"), true);
  assert.equal(runbook.release, "hold");
  assert.equal(runbook.doNotDispatchUntil.includes("不要外派为 full-success"), true);
});

test("preserves blocking aliases and falls back to admin operator guidance", () => {
  const runbook = createGatewayProjectionControlledSmokeReleaseRunbook({
    releaseDecisionAlias: "blocked-by-contract-or-config",
    controlledSmokePreflightAlias: "blocked-by-api-diagnostics",
    releaseDecisionHandoff: {
      status: "blocked",
      release: "hold",
      decision: "blocked-by-contract-or-config",
      aliases: ["environment_deploy_stale"],
    },
    controlledSmokePreflightHandoff: {
      status: "blocked",
      release: "hold",
      decision: "blocked-by-api-diagnostics",
      aliases: ["api_diagnostics_blocked"],
    },
    evidenceSummary: evidenceSummary({
      evidenceHints: [],
    }),
  });

  assert.equal(runbook.status, "blocked");
  assert.equal(runbook.reason, "controlled_smoke_release_runbook_blocking_alias");
  assert.equal(runbook.missingPrerequisites.includes("release_decision_not_ready:blocked-by-contract-or-config"), true);
  assert.equal(runbook.missingPrerequisites.includes("controlled_smoke_preflight_not_ready:blocked-by-api-diagnostics"), true);
  assert.equal(runbook.missingPrerequisites.includes("release_decision_status_blocked"), true);
  assert.equal(runbook.missingPrerequisites.includes("controlled_smoke_preflight_status_blocked"), true);
  assert.equal(runbook.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
});
