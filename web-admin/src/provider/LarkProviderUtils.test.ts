/* eslint-env jest */
import {expect} from "@jest/globals";

import {
  getLarkProviderBrand,
  getLarkProviderCallbackUrl,
  getLarkProviderEndpoint,
  getLarkProviderEndpointModeInfo,
  validateLarkProviderFields
} from "./LarkProviderUtils";

describe("LarkProviderUtils", () => {
  test("derives domestic Feishu endpoint and brand when global endpoint is disabled", () => {
    const provider = {type: "Lark", disableSsl: false, displayName: ""};

    expect(getLarkProviderEndpoint(provider)).toEqual({
      endpointMode: "domestic-feishu",
      authBaseUrl: "https://accounts.feishu.cn",
      authUrl: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
      apiBaseUrl: "https://open.feishu.cn",
    });
    expect(getLarkProviderBrand(provider)).toMatchObject({
      brandKey: "feishu",
      logoAssetKey: "lark-feishu-shared",
      defaultDisplayName: "Feishu",
      displayName: "Feishu",
      altText: "Sign in with Feishu",
      socialLogoPath: "/img/social_lark.png",
      buttonLogoPath: "/buttons/lark.svg",
    });
  });

  test("derives global Lark endpoint and brand when global endpoint is enabled", () => {
    const provider = {type: "Lark", disableSsl: true, displayName: ""};

    expect(getLarkProviderEndpoint(provider)).toEqual({
      endpointMode: "global-lark",
      authBaseUrl: "https://accounts.larksuite.com",
      authUrl: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
      apiBaseUrl: "https://open.larksuite.com",
    });
    expect(getLarkProviderBrand(provider)).toMatchObject({
      brandKey: "lark",
      logoAssetKey: "lark-feishu-shared",
      defaultDisplayName: "Lark",
      displayName: "Lark",
      altText: "Sign in with Lark",
      socialLogoPath: "/img/social_lark.png",
      buttonLogoPath: "/buttons/lark.svg",
    });
  });

  test("keeps displayName as a tenant label without changing endpoint mode", () => {
    const provider = {type: "Lark", disableSsl: false, displayName: "Company SSO"};

    expect(getLarkProviderEndpoint(provider).endpointMode).toBe("domestic-feishu");
    expect(getLarkProviderBrand(provider)).toMatchObject({
      brandKey: "feishu",
      defaultDisplayName: "Feishu",
      displayName: "Company SSO",
      altText: "Sign in with Company SSO",
    });
  });

  test("describes domestic Feishu endpoint mode for configuration guidance", () => {
    const provider = {type: "Lark", disableSsl: false};

    expect(getLarkProviderEndpointModeInfo(provider)).toEqual({
      modeName: "Domestic Feishu",
      authDomain: "accounts.feishu.cn",
      apiDomain: "open.feishu.cn",
      credentialPlatform: "Feishu open platform",
    });
  });

  test("describes global Lark endpoint mode for configuration guidance", () => {
    const provider = {type: "Lark", disableSsl: true};

    expect(getLarkProviderEndpointModeInfo(provider)).toEqual({
      modeName: "Global Lark",
      authDomain: "accounts.larksuite.com",
      apiDomain: "open.larksuite.com",
      credentialPlatform: "Lark open platform",
    });
  });

  test("builds callback URL from the current authentication center origin", () => {
    expect(getLarkProviderCallbackUrl("https://auth.example.com")).toBe("https://auth.example.com/callback");
  });

  test("requires App ID and App Secret for Lark OAuth providers", () => {
    const translate = (key: string) => key === "provider:This field is required" ? "is required" : key;

    expect(validateLarkProviderFields({
      type: "Lark",
      clientId: "",
      clientSecret: "secret",
    }, translate)).toBe("App ID is required");
    expect(validateLarkProviderFields({
      type: "Lark",
      clientId: "cli_xxx",
      clientSecret: "",
    }, translate)).toBe("App Secret is required");
    expect(validateLarkProviderFields({
      type: "Lark",
      clientId: "cli_xxx",
      clientSecret: "secret",
    }, translate)).toBe("");
  });
});
