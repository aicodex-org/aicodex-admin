/* eslint-env jest */

import {getAuthUrl} from "./Provider";
import * as Util from "./Util";

describe("Provider.getAuthUrl Lark authorization URL", () => {
  beforeEach(() => {
    Object.defineProperty(global, "crypto", {
      value: {
        getRandomValues: array => {
          array.fill(1);
          return array;
        },
      },
      configurable: true,
    });
    jest.spyOn(Util, "getStateFromQueryParams").mockReturnValue("state value");
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    const url = new URL(authUrl);

    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.feishu.cn/open-apis/authen/v1/authorize");
    expect(url.searchParams.get("client_id")).toBe("cli_aabbcc");
    expect(url.searchParams.get("app_id")).toBeNull();
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://auth.example.com/callback");
    expect(url.searchParams.get("state")).toBe("state value");
  });

  test("uses Lark account authorization endpoint and standard parameters for global mode", () => {
    const authUrl = getAuthUrl(application, {...baseProvider, disableSsl: true}, "signup");
    const url = new URL(authUrl);

    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.larksuite.com/open-apis/authen/v1/authorize");
    expect(url.searchParams.get("client_id")).toBe("cli_aabbcc");
    expect(url.searchParams.get("app_id")).toBeNull();
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://auth.example.com/callback");
    expect(url.searchParams.get("state")).toBe("state value");
  });
});
