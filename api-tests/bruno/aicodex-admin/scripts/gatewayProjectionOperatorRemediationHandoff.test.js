const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionOperatorRemediationHandoff;
try {
  ({
    createGatewayProjectionOperatorRemediationHandoff,
  } = require("./gatewayProjectionOperatorRemediationHandoff"));
} catch {
  createGatewayProjectionOperatorRemediationHandoff = () => ({
    status: "missing_module",
    reason: "gatewayProjectionOperatorRemediationHandoff_not_implemented",
    remediations: [],
  });
}

function readinessSummary(overrides = {}) {
  return {
    status: "blocked",
    aliases: [],
    mappingReadiness: {
      status: "ok",
      counts: {
        active_publishable: 1,
        tombstone_publishable: 0,
        mapping_missing: 0,
        mapping_untrusted: 0,
        lifecycle_not_publishable: 0,
        source_metadata_unavailable: 0,
        lineage_freshness_unavailable: 0,
      },
    },
    handoffs: [],
    ...overrides,
  };
}

function evidenceReadiness(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-evidence-review",
    release: "release_after_report",
    missingPrerequisites: [],
    redactionFlags: [],
    hardRedLineFlags: [],
    ownerHandoffs: [],
    ...overrides,
  };
}

function handoffInput(overrides = {}) {
  return {
    readinessSummary: readinessSummary(),
    evidenceReadiness: evidenceReadiness(),
    blockingAliases: [],
    ...overrides,
  };
}

function findRemediation(result, alias) {
  return result.remediations.find((item) => item.alias === alias) || {};
}

test("maps mapping missing evidence to Admin mapping remediation", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    readinessSummary: readinessSummary({
      aliases: ["mapping_missing"],
      mappingReadiness: {
        status: "blocked",
        counts: {
          active_publishable: 0,
          mapping_missing: 2,
        },
      },
    }),
  }), {
    generatedAt: "2026-06-13T14:00:00.000Z",
    sourceAlias: "local-dry-run",
  });

  const remediation = findRemediation(handoff, "mapping_missing");
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.generatedAt, "2026-06-13T14:00:00.000Z");
  assert.equal(handoff.sourceAlias, "local-dry-run");
  assert.equal(remediation.category, "mapping-readiness");
  assert.equal(remediation.owner, "admin_mapping_operator");
  assert.equal(remediation.minimumUnblockCondition.includes("PlatformApiUserMapping.ApiUserId"), true);
  assert.equal(remediation.actionList.some((item) => item.includes("display name")), true);
  assert.equal(JSON.stringify(handoff).includes("full-success"), true);
});

test("maps source freshness blockers to Admin source owner", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    readinessSummary: readinessSummary({
      aliases: ["source_connection_stale"],
    }),
  }));

  const remediation = findRemediation(handoff, "source_connection_stale");
  assert.equal(remediation.category, "source-freshness");
  assert.equal(remediation.owner, "admin_source_owner");
  assert.equal(remediation.minimumUnblockCondition.includes("source snapshot"), true);
  assert.equal(remediation.ownerBoundary.includes("API/Insight/Gateway"), true);
});

test("maps publisher, refresh and contract blockers to runtime owners", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    blockingAliases: ["publisher_disabled", "refresh_disabled", "gateway_contract_mismatch"],
  }));

  assert.equal(findRemediation(handoff, "publisher_disabled").owner, "admin_deploy_owner");
  assert.equal(findRemediation(handoff, "refresh_disabled").owner, "admin_runtime_owner");
  assert.equal(findRemediation(handoff, "gateway_contract_mismatch").owner, "admin_contract_owner");
  assert.equal(handoff.doNotDispatchUntil.includes("publish"), true);
});

test("maps active and tombstone fixture gaps to fixture owner", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    readinessSummary: readinessSummary({
      aliases: ["no_publishable_subjects"],
    }),
    blockingAliases: ["tombstone_fixture_missing"],
  }));

  assert.equal(findRemediation(handoff, "no_publishable_subjects").owner, "fixture_owner");
  assert.equal(findRemediation(handoff, "tombstone_fixture_missing").owner, "fixture_owner");
  assert.equal(findRemediation(handoff, "no_publishable_subjects").minimumUnblockCondition.includes("受控 active/tombstone subject fixture"), true);
});

test("keeps controlled smoke prerequisites evidence-scoped", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    evidenceReadiness: evidenceReadiness({
      status: "missing-api-diagnostics",
      missingPrerequisites: ["api_diagnostics_missing"],
    }),
    blockingAliases: ["controlled_smoke_preflight_missing"],
  }));

  assert.equal(findRemediation(handoff, "api_diagnostics_missing").owner, "api_diagnostics_owner");
  assert.equal(findRemediation(handoff, "controlled_smoke_preflight_missing").owner, "admin_operator");
  assert.equal(findRemediation(handoff, "controlled_smoke_preflight_missing").actionList.some((item) => item.includes("release decision")), true);
});

test("fails closed without echoing sensitive values", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    operatorMetadata: {
      token: "secret-value",
      rawResponseBody: { status: "ok" },
      email: "alice@example.invalid",
    },
  }));

  assert.equal(handoff.status, "redaction-required");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.remediations[0].alias, "sanitization_failed");
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
  assert.equal(JSON.stringify(handoff).includes("alice@example.invalid"), false);
});

test("blocks real write signals and full-success overclaims", () => {
  const writeBlocked = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    operatorNote: "trigger real publish and write gateway authorization facts",
  }));
  const overclaim = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    operatorNote: "mark API/Gateway/Insight success and projection full-success",
  }));

  assert.equal(writeBlocked.status, "red-line-blocked");
  assert.equal(writeBlocked.remediations[0].alias, "real_environment_write_signal");
  assert.equal(overclaim.status, "overclaim-full-success");
  assert.equal(overclaim.remediations[0].alias, "full_success_overclaim");
  assert.equal(overclaim.release, "hold");
});

test("falls back safely for unknown blocker aliases", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    blockingAliases: ["new_admin_projection_blocker"],
  }));

  const remediation = findRemediation(handoff, "new_admin_projection_blocker");
  assert.equal(remediation.category, "unknown-admin-remediation");
  assert.equal(remediation.owner, "admin_operator");
  assert.equal(remediation.actionList.some((item) => item.includes("Admin projection readiness")), true);
});

test("returns ready handoff when no blocker aliases remain", () => {
  const handoff = createGatewayProjectionOperatorRemediationHandoff(handoffInput({
    readinessSummary: readinessSummary({
      status: "ok",
      aliases: [],
    }),
  }));

  assert.equal(handoff.status, "ready-for-operator-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.remediations.length, 0);
  assert.equal(handoff.boundaries.some((item) => item.includes("不能外推为 API/Gateway/Insight 成功")), true);
});
