const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeEvidenceReadiness;
try {
  ({
    createGatewayProjectionControlledSmokeEvidenceReadiness,
  } = require("./gatewayProjectionControlledSmokeEvidenceReadiness"));
} catch {
  createGatewayProjectionControlledSmokeEvidenceReadiness = () => ({
    status: "missing_module",
    reason: "gatewayProjectionControlledSmokeEvidenceReadiness_not_implemented",
  });
}

function adminReleaseDecision(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready-for-controlled-smoke",
    aliases: [],
    ownerHandoffs: [{
      alias: "ready_for_controlled_smoke",
      owner: "admin_operator",
      minimumUnblockCondition: "Admin release decision evidence 已检查且无 blocking alias",
    }],
    ...overrides,
  };
}

function controlledSmokePreflight(overrides = {}) {
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

function releaseRunbook(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    reason: "controlled_smoke_release_runbook_ready",
    missingPrerequisites: [],
    hardRedLineFlags: [],
    ownerHandoffs: [{
      alias: "controlled_smoke_release_runbook_ready",
      owner: "admin_operator",
      minimumUnblockCondition: "release runbook evidence 已检查且无 red-line signal",
    }],
    ...overrides,
  };
}

function apiDiagnostics(overrides = {}) {
  return {
    status: "ready",
    decision: "api-diagnostics-clear",
    aliases: [],
    ownerHandoffs: [{
      alias: "api_diagnostics_clear",
      owner: "api_diagnostics_owner",
      minimumUnblockCondition: "API diagnostics readiness/release runbook evidence 已检查且无 blocker",
    }],
    ...overrides,
  };
}

function readyEvidence(overrides = {}) {
  return {
    adminReleaseDecision: adminReleaseDecision(),
    controlledSmokePreflight: controlledSmokePreflight(),
    controlledSmokeReleaseRunbook: releaseRunbook(),
    apiDiagnostics: apiDiagnostics(),
    redactionSignal: "sanitized",
    blockingAlias: undefined,
    ...overrides,
  };
}

test("returns ready only for sanitized Admin and API evidence bundle", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence(), {
    generatedAt: "2026-06-13T13:00:00.000Z",
    sourceAlias: "local-dry-run",
  });

  assert.equal(readiness.status, "ready-for-controlled-smoke-evidence-review");
  assert.equal(readiness.release, "release_after_report");
  assert.equal(readiness.generatedAt, "2026-06-13T13:00:00.000Z");
  assert.equal(readiness.sourceAlias, "local-dry-run");
  assert.equal(readiness.boundaries.some(item => item.includes("不能外推为 API/Gateway/Insight 成功")), true);
  assert.equal(readiness.doNotDispatchUntil.includes("full-success"), true);
});

test("fails closed when Admin release, preflight or runbook evidence is missing", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    controlledSmokePreflight: undefined,
  }));

  assert.equal(readiness.status, "missing-admin-preflight");
  assert.equal(readiness.release, "hold");
  assert.equal(readiness.missingPrerequisites.includes("controlled_smoke_preflight_missing"), true);
  assert.equal(readiness.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
});

test("fails closed when API diagnostics evidence is missing or blocked", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    apiDiagnostics: apiDiagnostics({
      status: "blocked",
      decision: "api-diagnostics-stale",
      aliases: ["api_diagnostics_stale"],
    }),
  }));

  assert.equal(readiness.status, "missing-api-diagnostics");
  assert.equal(readiness.release, "hold");
  assert.equal(readiness.missingPrerequisites.includes("api_diagnostics_not_ready:api-diagnostics-stale"), true);
  assert.equal(readiness.ownerHandoffs.some(item => item.owner === "api_diagnostics_owner"), true);
});

test("requires redaction when evidence contains sensitive fields or values", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    operatorMetadata: {
      token: "secret-value",
      contactEmail: "alice@example.invalid",
      rawResponseBody: { status: "ok" },
    },
  }));

  assert.equal(readiness.status, "redaction-required");
  assert.equal(readiness.redactionFlags.includes("sanitization_failed"), true);
  assert.equal(JSON.stringify(readiness).includes("secret-value"), false);
  assert.equal(JSON.stringify(readiness).includes("alice@example.invalid"), false);
});

test("blocks real write red-line signals", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    operatorNote: "trigger real publish and write authorization facts after report",
  }));

  assert.equal(readiness.status, "red-line-blocked");
  assert.equal(readiness.release, "hold");
  assert.equal(readiness.hardRedLineFlags.includes("real_environment_write_signal"), true);
  assert.equal(readiness.operatorNextActions.some(item => item.includes("只读脱敏 evidence")), true);
});

test("blocks full-success overclaim separately from redaction", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    operatorNote: "mark full-success because Gateway ingestion success and API success are confirmed",
  }));

  assert.equal(readiness.status, "overclaim-full-success");
  assert.equal(readiness.release, "hold");
  assert.equal(readiness.hardRedLineFlags.includes("full_success_overclaim"), true);
  assert.equal(readiness.doNotDispatchUntil.includes("不要外派为 full-success"), true);
});

test("preserves fallback owner guidance for blocking aliases", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    blockingAlias: "controlled_smoke_evidence_not_checked",
    adminReleaseDecision: adminReleaseDecision({
      status: "blocked",
      release: "hold",
      decision: "blocked-by-contract-or-config",
      aliases: ["environment_deploy_stale"],
    }),
  }));

  assert.equal(readiness.status, "missing-admin-preflight");
  assert.equal(readiness.missingPrerequisites.includes("blocking_alias:controlled_smoke_evidence_not_checked"), true);
  assert.equal(readiness.ownerHandoffs.some(item => item.alias === "environment_deploy_stale"), true);
  assert.equal(readiness.minimumUnblockConditions.length > 0, true);
});

test("does not treat non-extrapolation boundary text as overclaim", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    operatorNote: "不是 full-success，不能外推为 API success，也不得触发 gateway ingestion",
  }));

  assert.equal(readiness.status, "ready-for-controlled-smoke-evidence-review");
  assert.equal(readiness.hardRedLineFlags.length, 0);
});

test("falls back to local admin guidance when all Admin evidence is absent", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness({
    apiDiagnostics: apiDiagnostics(),
  });

  assert.equal(readiness.status, "missing-admin-preflight");
  assert.equal(readiness.missingPrerequisites.includes("admin_release_decision_missing"), true);
  assert.equal(readiness.missingPrerequisites.includes("controlled_smoke_preflight_missing"), true);
  assert.equal(readiness.missingPrerequisites.includes("controlled_smoke_release_runbook_missing"), true);
  assert.equal(readiness.ownerHandoffs.some(item => item.alias === "controlled_smoke_evidence_not_checked"), true);
  assert.equal(readiness.sourceAlias, "gateway_projection_controlled_smoke_evidence_readiness");
  assert.equal(Boolean(readiness.generatedAt), true);
});

test("fails closed when API diagnostics evidence is absent after Admin evidence is ready", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    apiDiagnostics: undefined,
  }));

  assert.equal(readiness.status, "missing-api-diagnostics");
  assert.equal(readiness.missingPrerequisites.includes("api_diagnostics_missing"), true);
  assert.equal(readiness.ownerHandoffs.some(item => item.owner === "api_diagnostics_owner"), true);
});

test("treats blocked runbook evidence as missing Admin preflight", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    controlledSmokeReleaseRunbook: releaseRunbook({
      status: "blocked",
      release: "hold",
      reason: "controlled_smoke_release_runbook_blocking_alias",
      missingPrerequisites: ["release_decision_not_ready:blocked-by-contract-or-config"],
    }),
  }));

  assert.equal(readiness.status, "missing-admin-preflight");
  assert.equal(readiness.missingPrerequisites.includes("controlled_smoke_release_runbook_not_ready:controlled_smoke_release_runbook_blocking_alias"), true);
});

test("treats non-ready controlled smoke preflight as missing Admin preflight", () => {
  const readiness = createGatewayProjectionControlledSmokeEvidenceReadiness(readyEvidence({
    controlledSmokePreflight: controlledSmokePreflight({
      status: "blocked",
      release: "hold",
      decision: "blocked-by-api-diagnostics",
      aliases: ["api_diagnostics_blocked"],
    }),
  }));

  assert.equal(readiness.status, "missing-admin-preflight");
  assert.equal(readiness.missingPrerequisites.includes("controlled_smoke_preflight_not_ready:blocked-by-api-diagnostics"), true);
});
