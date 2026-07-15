/* eslint-env jest */

import {expect, jest} from "@jest/globals";
import {
  buildSamlMetadataUrl,
  buildTermsOfUseResourcePath,
  filterProvidersForSave,
  filterSigninMethodsForSave,
  getRequiredApplicationFieldNames,
  normalizeApplicationFieldValue,
  normalizeCustomScopes,
  normalizeLoadedApplication,
  validateCustomScopes
} from "./applicationEditRules";

describe("application edit rules", () => {
  test("normalizes optional application collections without mutating the response record", () => {
    const application = {
      name: "portal",
      grantTypes: null,
      tags: undefined,
      providers: null,
    };

    const normalized = normalizeLoadedApplication(application);

    expect(normalized).toEqual({
      name: "portal",
      grantTypes: ["authorization_code"],
      tags: [],
      providers: [],
    });
    expect(application).toEqual({
      name: "portal",
      grantTypes: null,
      tags: undefined,
      providers: null,
    });
  });

  test("keeps existing loaded collections unchanged", () => {
    const application = {
      grantTypes: ["client_credentials"],
      tags: ["internal"],
      providers: [{name: "provider-main"}],
    };

    expect(normalizeLoadedApplication(application)).toEqual(application);
  });

  test("normalizes custom scope text and rejects a missing scope identifier", () => {
    const scopes = [
      {scope: " profile.read ", displayName: " Profile ", description: " Read profile "},
      {scope: " ", displayName: " Missing ", description: ""},
    ];

    expect(normalizeCustomScopes(scopes)).toEqual([
      {scope: "profile.read", displayName: "Profile", description: "Read profile"},
      {scope: "", displayName: "Missing", description: ""},
    ]);
    expect(validateCustomScopes(scopes)).toEqual({
      ok: false,
      scopes: [
        {scope: "profile.read", displayName: "Profile", description: "Read profile"},
        {scope: "", displayName: "Missing", description: ""},
      ],
    });
  });

  test("accepts valid custom scopes and safely handles non-array input", () => {
    expect(validateCustomScopes([{scope: "openid", displayName: "OpenID"}])).toEqual({
      ok: true,
      scopes: [{scope: "openid", displayName: "OpenID", description: ""}],
    });
    expect(validateCustomScopes(null)).toEqual({ok: true, scopes: []});
  });

  test("only converts the legacy offset field and identifies missing required fields", () => {
    const parseInteger = jest.fn((value: unknown) => Number.parseInt(String(value), 10));

    expect(normalizeApplicationFieldValue("offset", "12", parseInteger)).toBe(12);
    expect(normalizeApplicationFieldValue("displayName", " Portal ", parseInteger)).toBe(" Portal ");
    expect(parseInteger).toHaveBeenCalledTimes(1);
    expect(getRequiredApplicationFieldNames({name: " ", displayName: ""})).toEqual(["name", "displayName"]);
    expect(getRequiredApplicationFieldNames({name: "portal", displayName: "Portal"})).toEqual([]);
  });

  test("filters provider bindings and signin methods before saving", () => {
    expect(filterProvidersForSave(
      [{name: "provider-main"}, {name: "removed-provider"}],
      ["provider-main"]
    )).toEqual([{name: "provider-main"}]);
    expect(filterProvidersForSave([], ["provider-main"])).toEqual([]);
    expect(filterSigninMethodsForSave([
      {name: "Password"},
      {name: "Verification code"},
      {name: "Unsupported"},
    ])).toEqual([
      {name: "Password"},
      {name: "Verification code"},
    ]);
  });

  test("builds SAML metadata and terms resource paths from the current application context", () => {
    expect(buildSamlMetadataUrl("https://admin.example.test", "portal name", true)).toBe(
      "https://admin.example.test/api/saml/metadata?application=admin/portal%20name&enablePostBinding=true"
    );
    expect(buildTermsOfUseResourcePath("engineering", "portal")).toBe("termsOfUse/engineering/portal.html");
  });
});
