/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import {initAuthWithConfig} from "./Auth";
import {
  completeWecomProfileConsentLoginIntent,
  createWecomProfileConsentLoginIntent,
  createWecomProfileConsentProfileSyncIntent,
  getWecomProfileConsentIntentStatus,
  oAuthParamsToQuery
} from "./AuthBackend";

jest.mock("../Setting", () => ({
  getAcceptLanguage: () => "en",
}));

type MockedFetch = typeof fetch & {
  mock: {
    calls: Array<[string, RequestInit]>;
  };
};

describe("WeCom profile consent AuthBackend", () => {
  beforeEach(() => {
    initAuthWithConfig({serverUrl: "https://door.example.com"});
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({status: "ok"}),
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("creates a login intent with the current non-sensitive login context", async() => {
    const payload = {
      application: "app-built-in",
      provider: "built-in/wecom",
      method: "signup",
      returnUrl: "/login/oauth/authorize?client_id=app",
      loginContext: {
        type: "code",
        clientId: "app",
        responseType: "code",
      },
    };

    await createWecomProfileConsentLoginIntent(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://door.example.com/api/wecom-profile-consent/login-intents",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          "Accept-Language": "en",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  test("creates a profile sync intent with JSON body", async() => {
    const payload = {
      application: "app-built-in",
      provider: "built-in/wecom",
    };

    await createWecomProfileConsentProfileSyncIntent(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://door.example.com/api/wecom-profile-consent/profile-sync-intents",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          "Accept-Language": "en",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  test("polls an intent by header without putting pollToken in the URL", async() => {
    await getWecomProfileConsentIntentStatus("intent-1", "poll-token-1");

    const [url, options] = (global.fetch as MockedFetch).mock.calls[0];
    expect(url).toBe("https://door.example.com/api/wecom-profile-consent/intents/intent-1");
    expect(url).not.toContain("poll-token-1");
    expect(options.headers).toEqual(expect.objectContaining({
      "Accept-Language": "en",
      "X-WeCom-Profile-Consent-Poll-Token": "poll-token-1",
    }));
  });

  test("completes an intent by header and JSON body without putting pollToken in the URL", async() => {
    await completeWecomProfileConsentLoginIntent("intent-1", "poll-token-1", {
      mfaType: "totp",
      passcode: "123456",
    });

    const [url, options] = (global.fetch as MockedFetch).mock.calls[0];
    expect(url).toBe("https://door.example.com/api/wecom-profile-consent/intents/intent-1/complete");
    expect(url).not.toContain("poll-token-1");
    expect(options.headers).toEqual(expect.objectContaining({
      "Accept-Language": "en",
      "Content-Type": "application/json",
      "X-WeCom-Profile-Consent-Poll-Token": "poll-token-1",
    }));
    expect(JSON.parse(options.body as string)).toEqual({
      mfaType: "totp",
      passcode: "123456",
    });
  });

  test("OAuth query carries explicit organization context", () => {
    const query = oAuthParamsToQuery({
      clientId: "client-web",
      responseType: "code",
      redirectUri: "https://app.example.invalid/callback",
      type: "code",
      scope: "openid profile",
      state: "state-1",
      nonce: "nonce-1",
      challengeMethod: "S256",
      codeChallenge: "challenge-1",
      organization: "org-a",
    });

    expect(query).toContain("organization=org-a");
    expect(query).toContain("clientId=client-web");
    expect(query).not.toContain("client-web-org-org-a");
  });
});
