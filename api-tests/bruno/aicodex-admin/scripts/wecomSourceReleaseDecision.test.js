const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWecomSourceReleaseDecision,
} = require("./wecomSourceReleaseDecision");

const BOUNDARY_ASSERTIONS = [
  "组织树非空",
  "projection 可发布",
  "authorization facts 生效",
  "full-success",
];

function readinessHandoff(alias, overrides = {}) {
  const ready = alias === "wecom_source_ready";
  return {
    status: ready ? "ready" : "blocked",
    aliases: [alias],
    ownerHandoffs: ready ? [] : [{
      alias,
      owner: "admin_source_owner",
      nextAction: "解除 source readiness blocker",
    }],
    minimumUnblockConditions: ready ? [] : [{
      alias,
      owner: "admin_source_owner",
      condition: "source readiness blocker 已解除",
    }],
    safeNextActions: ready ? [
      "可以把该 WeCom source readiness handoff 交给组织树/projection 后续 owner 判断",
    ] : [
      "保持只读观察，不触发手动同步",
    ],
    evidenceShapeVersion: "wecom-source-readiness-handoff/v1",
    ...overrides,
  };
}

test("returns ready_for_org_tree_readiness only for wecom_source_ready handoff", () => {
  const decision = createWecomSourceReleaseDecision({
    sourceReadinessHandoff: readinessHandoff("wecom_source_ready"),
  }, {
    generatedAt: "2026-06-13T12:00:00.000Z",
    sourceAlias: "local-dry-run",
  });

  assert.equal(decision.status, "ready");
  assert.equal(decision.release, "release_after_report");
  assert.equal(decision.decision, "ready_for_org_tree_readiness");
  assert.equal(decision.reasonAlias, "wecom_source_ready");
  assert.equal(decision.sourceAlias, "local-dry-run");
  assert.equal(decision.generatedAt, "2026-06-13T12:00:00.000Z");
  assert.equal(decision.safeNextSteps.some(step => step.includes("只读 readiness")), true);
  assert.equal(decision.doNotProceedReasons.length > 0, true);
  for (const assertion of BOUNDARY_ASSERTIONS) {
    assert.equal(JSON.stringify(decision).includes(assertion), true);
  }
});

for (const alias of [
  "wecom_config_missing",
  "wecom_config_disabled",
  "wecom_credential_not_verified",
  "wecom_latest_run_failed",
  "wecom_no_recent_success",
  "wecom_run_active",
]) {
  test(`blocks release decision for ${alias}`, () => {
    const decision = createWecomSourceReleaseDecision({
      sourceReadinessHandoff: readinessHandoff(alias),
    });

    assert.equal(decision.status, "blocked");
    assert.equal(decision.release, "hold");
    assert.equal(decision.decision, "blocked");
    assert.equal(decision.reasonAlias, alias);
    assert.equal(decision.minimumUnblockConditions.some(item => item.alias === alias), true);
    assert.equal(decision.safeNextSteps.some(step => step.includes("不得触发")), true);
    assert.equal(decision.doNotProceedReasons.some(reason => reason.includes("full-success")), true);
  });
}

test("fails closed when readiness handoff reports sanitization failure", () => {
  const decision = createWecomSourceReleaseDecision({
    sourceReadinessHandoff: readinessHandoff("sanitization_failed"),
  });

  assert.equal(decision.status, "blocked");
  assert.equal(decision.release, "hold");
  assert.equal(decision.reasonAlias, "sanitization_failed");
  assert.equal(decision.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
  assert.equal(JSON.stringify(decision).includes("secret-value"), false);
});

test("fails closed when release decision input contains sensitive evidence", () => {
  const decision = createWecomSourceReleaseDecision({
    sourceReadinessHandoff: readinessHandoff("wecom_source_ready"),
    operatorMetadata: {
      token: "secret-value",
    },
  });

  assert.equal(decision.status, "blocked");
  assert.equal(decision.release, "hold");
  assert.equal(decision.reasonAlias, "sanitization_failed");
  assert.equal(JSON.stringify(decision).includes("secret-value"), false);
});

test("does not extrapolate ready source evidence to downstream success", () => {
  const decision = createWecomSourceReleaseDecision({
    sourceReadinessHandoff: readinessHandoff("wecom_source_ready", {
      downstreamFacts: {
        organizationTreeNonEmpty: true,
        gatewayProjectionFullSuccess: true,
      },
    }),
  });

  assert.equal(decision.decision, "blocked");
  assert.equal(decision.reasonAlias, "sanitization_failed");
  assert.equal(JSON.stringify(decision).includes("gatewayProjectionFullSuccess"), false);
});

test("returns not_checked when source readiness handoff is missing", () => {
  const decision = createWecomSourceReleaseDecision();

  assert.equal(decision.status, "not_checked");
  assert.equal(decision.release, "hold");
  assert.equal(decision.decision, "blocked");
  assert.equal(decision.reasonAlias, "wecom_source_readiness_not_checked");
  assert.equal(decision.safeNextSteps.some(step => step.includes("Source Readiness Handoff")), true);
});
