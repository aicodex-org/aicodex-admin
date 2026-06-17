import {expect} from "@jest/globals";
import {
  ACCESS_WIZARD_STEP_IDS,
  type AccessWizardDomain,
  buildAccessWizardPlans,
  filterAccessWizardPlans,
} from "./identityAccessWizard";

const providers = {
  pagePath: "/providers",
  rows: [
    {
      owner: "admin",
      name: "oidc-main",
      displayName: "OIDC Main",
      category: "OAuth",
      type: "OIDC",
      clientId: "",
      clientSecret: "raw-provider-secret",
      providerUrl: "https://idp.example.invalid/oauth",
      syncFieldMapping: "",
    },
  ],
  totalRows: 1,
};

const applications = {
  pagePath: "/applications",
  rows: [
    {
      owner: "admin",
      organization: "built-in",
      name: "portal",
      displayName: "Portal",
      clientId: "",
      clientSecret: "raw-app-secret",
      redirectUris: [],
      scopes: [],
      providers: [],
    },
  ],
  totalRows: 1,
};

const agents = {
  pagePath: "/agents",
  rows: [
    {
      owner: "built-in",
      name: "support-agent",
      displayName: "Support Agent",
      application: "",
      url: "https://agent.example.invalid/listen",
      token: "raw-agent-token",
    },
  ],
  totalRows: 1,
};

function getPlan(plans: ReturnType<typeof buildAccessWizardPlans>, domain: AccessWizardDomain) {
  const plan = plans.find(item => item.domain === domain);
  if (!plan) {
    throw new Error(`Missing plan: ${domain}`);
  }
  return plan;
}

describe("identity access wizard models", () => {
  test("builds three read-only P0 wizard plans with stable steps and evidence entries", () => {
    const plans = buildAccessWizardPlans({
      providers,
      applications,
      agents,
    });

    expect(plans.map(plan => plan.domain)).toEqual([
      "auth_source",
      "application_access",
      "llm_ai_gateway",
    ]);
    expect(plans.every(plan => plan.steps.map(step => step.id).join("|") === ACCESS_WIZARD_STEP_IDS.join("|"))).toBe(true);
    expect(plans.every(plan => plan.source.kind !== "global_aggregation")).toBe(true);
    expect(plans.every(plan => plan.safetyBoundary.forbiddenExecutions.length > 0)).toBe(true);
    expect(JSON.stringify(plans)).not.toContain("raw-provider-secret");
    expect(JSON.stringify(plans)).not.toContain("raw-app-secret");
    expect(JSON.stringify(plans)).not.toContain("raw-agent-token");
    expect(JSON.stringify(plans)).not.toContain("idp.example.invalid");
    expect(JSON.stringify(plans)).not.toContain("agent.example.invalid");
  });

  test("classifies domain-specific configuration gaps and safe next entries", () => {
    const plans = buildAccessWizardPlans({
      providers,
      applications,
      agents,
    });

    const authSource = getPlan(plans, "auth_source");
    expect(authSource.titleKey).toBe("domainAuthSourceTitle");
    expect(authSource.blockers.map(item => item.key)).toEqual(expect.arrayContaining([
      "auth-source-client-id",
      "auth-source-field-mapping",
    ]));
    expect(authSource.evidenceEntries.map(item => item.to)).toEqual(expect.arrayContaining([
      "/providers/admin/oidc-main",
      "/records",
    ]));

    const application = getPlan(plans, "application_access");
    expect(application.blockers.map(item => item.key)).toEqual(expect.arrayContaining([
      "application-client-id",
      "application-callback",
      "application-scope",
      "application-provider-binding",
    ]));
    expect(application.safeNextActions.map(item => item.to)).toEqual(expect.arrayContaining([
      "/applications/built-in/portal",
      "/providers",
    ]));

    const gateway = getPlan(plans, "llm_ai_gateway");
    expect(gateway.blockers.map(item => item.key)).toEqual(expect.arrayContaining([
      "gateway-identity-mapping",
      "gateway-readiness-evidence",
    ]));
    expect(gateway.evidenceEntries.map(item => item.to)).toEqual(expect.arrayContaining([
      "/agents/built-in/support-agent",
      "/platform-api-mappings",
    ]));
  });

  test("adds cannot-infer plans for unavailable sources instead of inventing readiness", () => {
    const plans = buildAccessWizardPlans({
      providers: {pagePath: "/providers", errorMessage: "request failed"},
      applications: {pagePath: "/applications", rows: [], totalRows: 0},
      agents: {pagePath: "/agents", errorMessage: "request failed"},
    });

    expect(getPlan(plans, "auth_source")).toMatchObject({
      resultStatus: "cannot_infer",
      sourceOfTruth: "source_unavailable",
    });
    expect(getPlan(plans, "llm_ai_gateway").blockers.map(item => item.kind)).toContain("cannot_infer");
    expect(getPlan(plans, "application_access").resultStatus).toBe("blocked");
  });

  test("filters wizard plans by domain result status and keyword", () => {
    const plans = buildAccessWizardPlans({
      providers,
      applications,
      agents,
    });

    expect(filterAccessWizardPlans(plans, {domain: "auth_source"}).map(item => item.domain)).toEqual(["auth_source"]);
    expect(filterAccessWizardPlans(plans, {resultStatus: "blocked"}).length).toBe(3);
    expect(filterAccessWizardPlans(plans, {keyword: "Portal"}).map(item => item.domain)).toEqual(["application_access"]);
    expect(filterAccessWizardPlans(plans, {keyword: "Gateway"}).map(item => item.domain)).toEqual(["llm_ai_gateway"]);
  });
});
