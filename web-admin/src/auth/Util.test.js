/* eslint-env jest */

import {
  getQueryParamsFromState,
  getStateFromQueryParams,
} from "./Util";

describe("OAuth state utilities", () => {
  let originalCrypto;

  beforeEach(() => {
    originalCrypto = window.crypto;
    Object.defineProperty(window, "crypto", {
      value: {
        getRandomValues: array => {
          array.fill(1);
          return array;
        },
      },
      configurable: true,
    });
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "crypto", {
      value: originalCrypto,
      configurable: true,
    });
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  test("stores long OIDC parameters behind a short alphanumeric state", () => {
    window.history.pushState(
      {},
      "",
      "/login/oauth/authorize?client_id=2c380748645530b43f58&nonce=R46Goo1VivW4vq8tBzd9YgSFmEBA82Kd&redirect_uri=https%3A%2F%2Fai.leagsoft.com%2Foauth%2Faicodex-admin&response_type=code&scope=openid+profile+email&state=aos1.1780973775.4KIIZWxnd9jDpaVa83wX4xWSSDFihwrH.4Er0JU__4D2kb1U4X0VB4YIBZv7meTT5muYsvJwp09s"
    );

    const state = getStateFromQueryParams("AICodex API 网关生产", "wecom-internal", "signup", true);

    expect(state).toMatch(/^[A-Za-z0-9]+$/);
    expect(state.length).toBeLessThanOrEqual(128);
    expect(state).not.toContain("2c380748645530b43f58");

    const restored = getQueryParamsFromState(state);
    const restoredParams = new URLSearchParams(restored);
    expect(restoredParams.get("client_id")).toBe("2c380748645530b43f58");
    expect(restoredParams.get("redirect_uri")).toBe("https://ai.leagsoft.com/oauth/aicodex-admin");
    expect(restoredParams.get("scope")).toBe("openid profile email");
    expect(restoredParams.get("nonce")).toBe("R46Goo1VivW4vq8tBzd9YgSFmEBA82Kd");
    expect(restoredParams.get("application")).toBe("AICodex API 网关生产");
    expect(restoredParams.get("provider")).toBe("wecom-internal");
    expect(restoredParams.get("method")).toBe("signup");

    sessionStorage.removeItem(state);
    expect(getQueryParamsFromState(state)).toBe(restored);
  });

  test("keeps legacy base64 state decoding compatible", () => {
    const query = "?client_id=legacy-client&application=legacy-app&provider=legacy-provider&method=signup";
    expect(getQueryParamsFromState(btoa(query))).toBe(query);
  });

  test("does not decode missing generated short states as base64", () => {
    expect(getQueryParamsFromState("casdoorOauthMissingState000000")).toBe("");
  });
});
