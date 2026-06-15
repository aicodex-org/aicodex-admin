const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionRemediationResultEvidenceHandoff;
try {
  ({
    createGatewayProjectionRemediationResultEvidenceHandoff,
  } = require("./gatewayProjectionRemediationResultEvidenceHandoff"));
} catch {
  createGatewayProjectionRemediationResultEvidenceHandoff = () => ({
    status: "missing_module",
    reason: "gatewayProjectionRemediationResultEvidenceHandoff_not_implemented",
    evidenceAliases: [],
    ownerHandoffs: [],
    minimumUnblockConditions: [],
    nextSafeAction: "blocked",
    doNotDispatchUntil: "helper_not_implemented",
    nonExtrapolation: [],
  });
}

function resultInput(overrides = {}) {
  return {
    mappingRemediationResult: {
      status: "cleared",
      aliases: [
        "mapping_remediation_cleared",
        "mapping_confirmed_api_user_id",
        "mapping_status_trusted",
        "lifecycle_readiness_confirmed",
      ],
    },
    sourceFreshnessRemediationResult: {
      status: "cleared",
      aliases: [
        "source_freshness_remediation_cleared",
        "source_snapshot_fresh",
        "org_sync_batch_fresh",
      ],
    },
    deployRuntimeResult: {
      status: "confirmed",
      aliases: [
        "deploy_runtime_shape_confirmed",
        "current_observability_shape_confirmed",
      ],
    },
    fixtureAuthorizationResult: {
      status: "authorized",
      aliases: [
        "fixture_authorized",
        "subject_count_ge_1_authorized",
      ],
      counts: {
        subjectCount: 1,
      },
    },
    controlledSmokeEvidenceResult: {
      status: "cleared",
      aliases: [
        "controlled_smoke_evidence_prerequisites_clear",
        "api_diagnostics_clear",
      ],
    },
    ...overrides,
  };
}

function hasOwner(result, owner) {
  return result.ownerHandoffs.some((item) => item.owner === owner);
}

function hasCondition(result, alias) {
  return result.minimumUnblockConditions.some((item) => item.alias === alias);
}

test("returns ready for controlled smoke evidence review only when all remediation result evidence is clear", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput(), {
    sourceAlias: "local-dry-run",
  });

  assert.equal(handoff.status, "ready-for-controlled-smoke-evidence-review");
  assert.equal(handoff.reason, "remediation_result_evidence_ready");
  assert.equal(handoff.evidenceAliases.includes("mapping_remediation_cleared"), true);
  assert.equal(handoff.evidenceAliases.includes("subject_count_ge_1_authorized"), true);
  assert.equal(handoff.ownerHandoffs.length, 0);
  assert.equal(handoff.minimumUnblockConditions.length, 0);
  assert.equal(handoff.nextSafeAction.includes("controlled smoke evidence review"), true);
  assert.equal(handoff.nextSafeAction.includes("preflight"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.nonExtrapolation.some((item) => item.includes("真实 publish")), true);
});

test("blocks when mapping remediation is unresolved or still requires user authorization", () => {
  const unresolved = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    mappingRemediationResult: {
      status: "blocked",
      aliases: ["mapping_remediation_not_cleared"],
    },
  }));
  const needsAuthorization = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    mappingRemediationResult: {
      status: "requires-user-authorization",
      aliases: ["mapping_user_authorization_required"],
    },
  }));

  assert.equal(unresolved.status, "blocked");
  assert.equal(unresolved.reason, "mapping_remediation_not_cleared");
  assert.equal(hasOwner(unresolved, "admin_mapping_operator"), true);
  assert.equal(hasCondition(unresolved, "mapping_remediation_not_cleared"), true);
  assert.equal(unresolved.nextSafeAction.includes("PlatformApiUserMapping.ApiUserId"), true);
  assert.equal(needsAuthorization.reason, "mapping_user_authorization_required");
  assert.equal(hasOwner(needsAuthorization, "admin_mapping_operator"), true);
});

test("blocks source freshness and deploy runtime result gaps with Admin owners", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    sourceFreshnessRemediationResult: {
      status: "blocked",
      aliases: ["source_freshness_remediation_not_cleared"],
    },
    deployRuntimeResult: {
      status: "not-confirmed",
      aliases: ["deploy_runtime_shape_not_confirmed"],
    },
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(hasOwner(handoff, "admin_source_owner"), true);
  assert.equal(hasOwner(handoff, "admin_deploy_owner"), true);
  assert.equal(hasCondition(handoff, "source_freshness_remediation_not_cleared"), true);
  assert.equal(hasCondition(handoff, "deploy_runtime_shape_not_confirmed"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("gateway ingestion"), true);
});

test("keeps fixture or subjectCount authorization gaps blocked", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    fixtureAuthorizationResult: {
      status: "not-authorized",
      aliases: ["fixture_authorization_required"],
      counts: {
        subjectCount: 0,
      },
    },
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.reason, "fixture_authorization_required");
  assert.equal(hasOwner(handoff, "fixture_owner"), true);
  assert.equal(hasCondition(handoff, "fixture_authorization_required"), true);
  assert.equal(handoff.minimumUnblockConditions[0].condition.includes("subjectCount>=1"), true);
  assert.equal(handoff.nonExtrapolation.some((item) => item.includes("empty subject")), true);
});

test("keeps controlled smoke evidence blockers evidence-scoped", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    controlledSmokeEvidenceResult: {
      status: "blocked",
      aliases: [
        "controlled_smoke_evidence_not_cleared",
        "api_diagnostics_missing",
      ],
    },
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(hasOwner(handoff, "admin_operator"), true);
  assert.equal(hasOwner(handoff, "api_diagnostics_owner"), true);
  assert.equal(hasCondition(handoff, "api_diagnostics_missing"), true);
  assert.equal(handoff.nextSafeAction.includes("脱敏 evidence"), true);
});

test("fails closed without echoing sensitive values", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    operatorMetadata: {
      token: "secret-value",
      rawResponseBody: { status: "ok" },
      email: "alice@example.invalid",
    },
  }));

  assert.equal(handoff.status, "redaction-required");
  assert.equal(handoff.reason, "sanitization_failed");
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
  assert.equal(JSON.stringify(handoff).includes("alice@example.invalid"), false);
});

test("blocks real write signals and full-success overclaims", () => {
  const writeBlocked = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    operatorNote: "trigger real publish and write gateway authorization facts",
  }));
  const overclaim = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    operatorNote: "mark API/Gateway/Insight success and projection full-success",
  }));

  assert.equal(writeBlocked.status, "red-line-blocked");
  assert.equal(writeBlocked.reason, "real_environment_write_signal");
  assert.equal(overclaim.status, "overclaim-full-success");
  assert.equal(overclaim.reason, "full_success_overclaim");
});

test("unknown remediation result aliases remain blocked and Admin-scoped", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    resultAliases: ["unexpected_operator_result_alias"],
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.reason, "unknown_remediation_result_alias");
  assert.equal(hasOwner(handoff, "admin_operator"), true);
  assert.equal(hasCondition(handoff, "unexpected_operator_result_alias"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin owner result alias"), true);
});

test("ignores non-extrapolation boundary text and accepts authorized top-level subject counts", () => {
  const handoff = createGatewayProjectionRemediationResultEvidenceHandoff(resultInput({
    fixtureAuthorizationResult: {
      status: "authorized",
      aliases: ["fixture_authorized"],
      subjectCount: 1,
    },
    operatorNote: "不是 full-success，也不能证明真实 publish 或 gateway ingestion",
    nonExtrapolation: ["full-success、真实 publish 和 gateway ingestion 都不能外推"],
  }));

  assert.equal(handoff.status, "ready-for-controlled-smoke-evidence-review");
  assert.equal(handoff.reason, "remediation_result_evidence_ready");
});
