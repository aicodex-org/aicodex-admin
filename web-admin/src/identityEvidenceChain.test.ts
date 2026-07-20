import {describe, expect, test} from "vitest";
import {buildIdentityEvidenceChainCatalog} from "./identityEvidenceChain";

describe("identityEvidenceChain", () => {
  test("builds a compact catalog across identity assets and evidence domains", () => {
    const catalog = buildIdentityEvidenceChainCatalog();

    expect(catalog.map(item => item.object.type)).toEqual([
      "Application",
      "Provider",
      "Organization",
      "User",
      "Role",
      "Gateway mapping",
      "Audit record",
    ]);
    expect(catalog.map(item => item.object.displayName)).toEqual(expect.arrayContaining([
      "应用接入",
      "认证源",
      "组织身份",
      "用户身份",
      "角色权限",
      "Gateway / LLM AI",
      "审计证据",
    ]));
    expect(catalog.flatMap(item => item.relationships.map(relationship => relationship.type))).toEqual(expect.arrayContaining([
      "application_access",
      "auth_source",
      "organization_scope",
      "user_identity",
      "role_permission",
      "gateway_mapping",
      "audit_evidence",
    ]));
  });

  test("keeps evidence links read-only and avoids sensitive raw values", () => {
    const catalog = buildIdentityEvidenceChainCatalog();
    const allLinks = catalog.flatMap(item => item.evidenceEntries.map(entry => entry.to));
    const serialized = JSON.stringify(catalog);

    expect(allLinks).toEqual(expect.arrayContaining([
      "/applications",
      "/providers",
      "/organization-directory-quality",
      "/roles",
      "/platform-api-mappings",
      "/records",
      "/tokens",
      "/verifications",
    ]));
    expect(serialized).not.toMatch(/clientSecret|accessToken|refreshToken|cookie|private\.example/i);
    expect(serialized).not.toMatch(/publish|cleanup|receipt|callback execute/i);
    expect(catalog.every(item => item.redactionSummary.hiddenFields.length === 0)).toBe(true);
  });
});
