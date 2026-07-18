import {describe, expect, test} from "vitest";
import {
  applyEnterpriseTlsPolicy,
  isEnterpriseTlsProvider,
  isEnterpriseTlsSyncer,
  prepareEnterpriseTlsRecord,
  projectSslCertOptions,
  validateEnterpriseTlsPolicy
} from "./enterpriseTlsPolicy";

describe("enterprise TLS policy contract", () => {
  ([
    [{category: "OAuth", type: "ADFS"}, true],
    [{category: "Email", type: "Default"}, true],
    [{category: "Email", type: "SUBMAIL"}, true],
    [{category: "Email", type: "Azure ACS"}, false],
    [{category: "Email", type: "Custom HTTP Email"}, false],
    [{category: "Email", type: "SendGrid"}, false],
    [{category: "Email", type: "Resend"}, false],
    [{category: "OAuth", type: "GitHub"}, false],
  ] as Array<[{category: string; type: string}, boolean]>).forEach(([provider, expected]) => {
    test(`scopes ${provider.category}/${provider.type} Provider policy controls`, () => {
      expect(isEnterpriseTlsProvider(provider)).toBe(expected);
    });
  });

  test("scopes Syncer policy controls to Active Directory", () => {
    expect(isEnterpriseTlsSyncer({type: "Active Directory"})).toBe(true);
    expect(isEnterpriseTlsSyncer({type: "Database"})).toBe(false);
  });

  test("normalizes only target add drafts while preserving edit presence", () => {
    expect(prepareEnterpriseTlsRecord({type: "ADFS"}, true, true)).toEqual({type: "ADFS", tlsPolicy: "system"});
    expect(prepareEnterpriseTlsRecord({type: "ADFS", tlsPolicy: ""}, true, true)).toEqual({type: "ADFS", tlsPolicy: "system"});
    expect(prepareEnterpriseTlsRecord({type: "ADFS"}, true, false)).toEqual({type: "ADFS", tlsPolicy: ""});
    expect(prepareEnterpriseTlsRecord({type: "ADFS", tlsPolicy: ""}, true, false)).toEqual({type: "ADFS", tlsPolicy: ""});
    expect(prepareEnterpriseTlsRecord({type: "ADFS", tlsPolicy: "future-mode"}, true, false)).toEqual({type: "ADFS", tlsPolicy: "future-mode"});
    expect(prepareEnterpriseTlsRecord({type: "GitHub"}, false, true)).toEqual({type: "GitHub"});
  });

  test("clears custom CA references when selecting a non-custom policy", () => {
    const record = {tlsPolicy: "custom-ca", cert: "enterprise-ca", displayName: "Directory"};

    expect(applyEnterpriseTlsPolicy(record, "custom-ca")).toEqual(record);
    expect(applyEnterpriseTlsPolicy(record, "system")).toEqual({...record, tlsPolicy: "system", cert: ""});
    expect(applyEnterpriseTlsPolicy(record, "legacy-insecure")).toEqual({...record, tlsPolicy: "legacy-insecure", cert: ""});
  });

  test("projects only SSL certificate names and drops raw certificate fields", () => {
    const options = projectSslCertOptions([
      {name: "enterprise-ca", type: "SSL", certificate: "raw-certificate-sentinel", privateKey: "private-key-sentinel"},
      {name: "signing-cert", type: "JWT", certificate: "jwt-certificate-sentinel"},
      {name: "", type: "SSL"},
    ]);

    expect(options).toEqual([{name: "enterprise-ca"}]);
    expect(JSON.stringify(options)).not.toContain("raw-certificate-sentinel");
    expect(JSON.stringify(options)).not.toContain("private-key-sentinel");
  });

  ([
    [{tlsPolicy: ""}, null],
    [{tlsPolicy: undefined}, null],
    [{tlsPolicy: "system"}, null],
    [{tlsPolicy: "future-mode"}, "invalid-policy"],
    [{tlsPolicy: "custom-ca", cert: ""}, "ca-required"],
    [{tlsPolicy: "custom-ca", cert: "missing-ca"}, "ca-unavailable"],
    [{tlsPolicy: "custom-ca", cert: "enterprise-ca"}, null],
    [{tlsPolicy: "legacy-insecure", cert: "enterprise-ca"}, "ca-conflict"],
  ] as Array<[Record<string, unknown>, string | null]>).forEach(([record, expected]) => {
    test(`validates policy and CA conflicts before save: ${String(record.tlsPolicy)}/${String(record.cert ?? "")}`, () => {
      expect(validateEnterpriseTlsPolicy(record, true, [{name: "enterprise-ca"}])).toBe(expected);
    });
  });

  test("ignores TLS fields for non-target records", () => {
    expect(validateEnterpriseTlsPolicy({tlsPolicy: "future-mode", cert: "other-cert"}, false, [])).toBeNull();
  });
});
