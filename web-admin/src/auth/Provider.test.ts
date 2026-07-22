import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";

import React from "react";
import {getAuthUrl, getProviderLogoWidget} from "./Provider";
import * as Util from "./Util";

describe("Provider.getAuthUrl Lark authorization URL", () => {
  beforeEach(() => {
    Object.defineProperty(global, "crypto", {
      value: {
        getRandomValues: (array: Uint8Array) => {
          array.fill(1);
          return array;
        },
      },
      configurable: true,
    });
    vi.spyOn(Util, "getStateFromQueryParams").mockReturnValue("state value");
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const application = {
    name: "aicodex-web",
    organization: "built-in",
    forcedRedirectOrigin: "https://auth.example.com",
  };

  const baseProvider = {
    category: "OAuth",
    type: "Lark",
    name: "lark-provider",
    clientId: "cli_aabbcc",
  };

  test("uses Feishu account authorization endpoint and standard parameters for domestic mode", () => {
    const authUrl = getAuthUrl(application, {...baseProvider, disableSsl: false}, "signup");
    const url = new URL(authUrl as string);

    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.feishu.cn/open-apis/authen/v1/authorize");
    expect(url.searchParams.get("client_id")).toBe("cli_aabbcc");
    expect(url.searchParams.get("app_id")).toBeNull();
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://auth.example.com/callback");
    expect(url.searchParams.get("state")).toBe("state value");
  });

  test("uses Lark account authorization endpoint and standard parameters for global mode", () => {
    const authUrl = getAuthUrl(application, {...baseProvider, disableSsl: true}, "signup");
    const url = new URL(authUrl as string);

    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.larksuite.com/open-apis/authen/v1/authorize");
    expect(url.searchParams.get("client_id")).toBe("cli_aabbcc");
    expect(url.searchParams.get("app_id")).toBeNull();
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://auth.example.com/callback");
    expect(url.searchParams.get("state")).toBe("state value");
  });
});

describe("Provider.getAuthUrl WeCom authorization URL", () => {
  beforeEach(() => {
    Object.defineProperty(global, "crypto", {
      value: {
        getRandomValues: (array: Uint8Array) => {
          array.fill(1);
          return array;
        },
      },
      configurable: true,
    });
    vi.spyOn(Util, "getStateFromQueryParams").mockReturnValue("state value");
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("keeps provider scope for internal normal QR login", () => {
    const application = {
      name: "aicodex-web",
      organization: "built-in",
      forcedRedirectOrigin: "https://auth.example.com",
    };
    const provider = {
      category: "OAuth",
      type: "WeCom",
      subType: "Internal",
      method: "Normal",
      name: "wecom-provider",
      clientId: "ww-corp-id",
      appId: "1000002",
      scopes: "snsapi_privateinfo",
    };

    const authUrl = getAuthUrl(application, provider, "signup");
    const url = new URL(authUrl as string);

    expect(`${url.origin}${url.pathname}`).toBe("https://login.work.weixin.qq.com/wwlogin/sso/login");
    expect(url.searchParams.get("login_type")).toBe("CorpApp");
    expect(url.searchParams.get("appid")).toBe("ww-corp-id");
    expect(url.searchParams.get("agentid")).toBe("1000002");
    expect(url.searchParams.get("redirect_uri")).toBe("https://auth.example.com/callback");
    expect(url.searchParams.get("state")).toBe("state value");
    expect(url.searchParams.get("scope")).toBe("snsapi_privateinfo");
    expect(Util.getStateFromQueryParams).toHaveBeenCalledWith("aicodex-web", "wecom-provider", "signup", true);
  });
});

describe("Provider.getProviderLogoWidget", () => {
  test("wraps image logos in a neutral badge so transparent dark icons stay visible", () => {
    const widget = getProviderLogoWidget(
      {category: "OAuth", type: "GitHub", displayName: "GitHub Login"},
      {disableLink: true}
    ) as React.ReactElement<{children: React.ReactElement<{children: React.ReactNode; style: React.CSSProperties}>}>;
    const badge = widget.props.children;
    const image = badge.props.children as React.ReactElement<{alt: string}>;

    expect(badge.type).toBe("span");
    expect(badge.props.style.background).toBe("#ffffff");
    expect(image.type).toBe("img");
    expect(image.props.alt).toBe("GitHub Login");
  });

  test("uses a text fallback instead of an empty image when logo URL is unavailable", () => {
    const widget = getProviderLogoWidget(
      {category: "SAML", type: "SAML", displayName: "SAML Enterprise"},
      {disableLink: true}
    ) as React.ReactElement<{children: React.ReactElement<{children: string; "aria-label": string}>}>;
    const fallback = widget.props.children;

    expect(fallback.type).toBe("span");
    expect(fallback.props["aria-label"]).toBe("SAML Enterprise logo");
    expect(fallback.props.children).toBe("SAML");
  });
});
