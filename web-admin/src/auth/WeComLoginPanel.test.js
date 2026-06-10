/* eslint-env jest */
import React from "react";
import {act, fireEvent, render} from "@testing-library/react";

jest.mock("i18next", () => ({
  t: key => {
    const [, value] = key.split(":");
    return value || key;
  },
}));

jest.mock("antd", () => {
  const actual = jest.requireActual("antd");
  return {
    ...actual,
    QRCode: ({value, status, size, style}) => (
      <div data-testid="wecom-oauth-qrcode" data-value={value} data-status={status} data-size={size} style={style} />
    ),
  };
});

jest.mock("./mfa/MfaAuthVerifyForm", () => ({
  MfaAuthVerifyForm: () => <div data-testid="wecom-mfa-form" />,
  NextMfa: "NextMfa",
}));

import WeComLoginPanel from "./WeComLoginPanel";
import * as AuthBackend from "./AuthBackend";
import * as Provider from "./Provider";

jest.mock("./AuthBackend", () => ({
  createWecomProfileConsentLoginIntent: jest.fn(),
  getWecomProfileConsentIntentStatus: jest.fn(),
  completeWecomProfileConsentLoginIntent: jest.fn(),
}));

jest.mock("./Provider", () => ({
  getAuthUrl: jest.fn(() => "https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo"),
}));

describe("WeComLoginPanel", () => {
  const defaultWeComWidgetAuthUrl = "https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo";
  const internalWeComApplication = {
    name: "app-built-in",
    organization: "built-in",
    providers: [
      {
        provider: {
          owner: "built-in",
          name: "wecom-internal",
          type: "WeCom",
          subType: "Internal",
          method: "Normal",
          clientId: "wx-test-appid",
          clientSecret: "secret",
          appId: "1000002",
          scopes: "snsapi_privateinfo",
        },
      },
    ],
  };

  async function flushEffects() {
    await act(async() => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  afterEach(() => {
    jest.useRealTimers();
    delete window.WwLogin;
    document.querySelectorAll("script[data-wecom-login-widget='true']").forEach(script => script.remove());
    jest.clearAllMocks();
    Provider.getAuthUrl.mockReturnValue(defaultWeComWidgetAuthUrl);
  });

  test("shows a configuration warning when no WeCom provider is available", async() => {
    const {getByText} = render(
      <WeComLoginPanel
        application={{providers: []}}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByText("WeCom login is not configured for the current application")).toBeInTheDocument();
  });

  test("shows fallback launch button for non-internal-normal mode", async() => {
    const application = {
      name: "app-built-in",
      organization: "built-in",
      providers: [
        {
          provider: {
            owner: "built-in",
            name: "wecom-third-party",
            type: "WeCom",
            subType: "Third-party",
            method: "Normal",
            clientId: "wx-test-appid",
            clientSecret: "secret",
            appId: "",
          },
        },
      ],
    };

    const {getByText} = render(
      <WeComLoginPanel
        application={application}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByText("Homepage WeCom QR login currently supports Internal + Normal mode only")).toBeInTheDocument();
  });

  test("shows a configuration warning when the internal provider is incomplete", async() => {
    const application = {
      name: "app-built-in",
      providers: [
        {
          provider: {
            owner: "built-in",
            name: "wecom-internal",
            type: "WeCom",
            subType: "Internal",
            method: "Normal",
            clientId: "wx-test-appid",
            clientSecret: "",
            appId: "1000002",
          },
        },
      ],
    };

    const {getByText} = render(
      <WeComLoginPanel
        application={application}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByText("WeCom login configuration is incomplete. Please check Corp ID, Secret and Agent ID")).toBeInTheDocument();
  });

  test("creates a profile consent intent and renders the OAuth2 QR code as the primary path", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        shortAuthUrl: "/api/wecom-profile-consent/intents/intent-1/authorize?state=short-state",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    const {getByText, getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
        getLoginContext={() => ({type: "code", clientId: "app-built-in", responseType: "code"})}
      />
    );

    await flushEffects();
    expect(AuthBackend.createWecomProfileConsentLoginIntent).toHaveBeenCalledWith({
      application: "app-built-in",
      provider: "built-in/wecom-internal",
      method: "signup",
      returnUrl: window.location.pathname + window.location.search,
      loginContext: {
        type: "code",
        method: "signup",
        signinMethod: "wecom",
        clientId: "app-built-in",
        responseType: "code",
      },
    });
    expect(getByText("Use WeCom to scan the QR code and consent to sign in")).toBeInTheDocument();
    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-value", "/api/wecom-profile-consent/intents/intent-1/authorize?state=short-state");
    expect(window.WwLogin).toBeUndefined();
  });

  test("falls back to the full OAuth2 URL when short authorization URL is unavailable", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    const {getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-value", "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo");
  });

  test("uses the selected WeCom provider and return URL override when creating an intent", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
        providerId="built-in/wecom-internal"
        getReturnUrl={() => "/login/oauth/authorize?client_id=app-built-in"}
      />
    );

    await flushEffects();
    expect(AuthBackend.createWecomProfileConsentLoginIntent).toHaveBeenCalledWith(expect.objectContaining({
      provider: "built-in/wecom-internal",
      returnUrl: "/login/oauth/authorize?client_id=app-built-in",
    }));
  });

  test("keeps the OAuth2 QR code complete with quiet-zone padding", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    const {getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    const qrCode = getByTestId("wecom-oauth-qrcode");
    expect(qrCode).toHaveAttribute("data-size", "256");
    expect(qrCode.parentElement).toHaveStyle("padding: 12px");
    expect(qrCode.parentElement).toHaveStyle("background-color: rgb(255, 255, 255)");
    expect(qrCode.parentElement.parentElement).toHaveStyle("min-height: 300px");
  });

  test("refreshes the OAuth2 authorization QR code from the primary action", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    const {getByText} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    fireEvent.click(getByText("Refresh"));
    await flushEffects();
    expect(AuthBackend.createWecomProfileConsentLoginIntent).toHaveBeenCalledTimes(2);
  });

  test("shows expired status text when polling reports expiration without detail", async() => {
    jest.useFakeTimers();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {status: "expired"},
    });

    const {getByText} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(getByText("WeCom QR code has expired")).toBeInTheDocument();
  });

  test("shows an error when creating the OAuth2 intent fails", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "error",
      msg: "intent creation failed",
    });

    const {getByText, getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByText("intent creation failed")).toBeInTheDocument();
    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-status", "expired");
  });

  test("shows an error when creating the OAuth2 intent rejects", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockRejectedValue(new Error("network failed"));

    const {getByText} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByText("network failed")).toBeInTheDocument();
  });

  test("polls authorization status and completes login after authorization", async() => {
    jest.useFakeTimers();
    const onLoginResponse = jest.fn();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {status: "authorized", expiresAt: "2026-06-04T12:05:00Z"},
    });
    AuthBackend.completeWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: "/",
    });

    render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
        onLoginResponse={onLoginResponse}
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(AuthBackend.getWecomProfileConsentIntentStatus).toHaveBeenCalledWith("intent-1", "poll-token-1");
    expect(AuthBackend.completeWecomProfileConsentLoginIntent).toHaveBeenCalledWith("intent-1", "poll-token-1", {});
    expect(onLoginResponse).toHaveBeenCalledWith({status: "ok", data: "/"});
  });

  test("shows MFA form when intent completion requires MFA", async() => {
    jest.useFakeTimers();
    const onLoginResponse = jest.fn();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {status: "authorized", expiresAt: "2026-06-04T12:05:00Z"},
    });
    AuthBackend.completeWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: "NextMfa",
      data2: [{mfaType: "totp", isPreferred: true}],
    });

    const {getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
        onLoginResponse={onLoginResponse}
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(getByTestId("wecom-mfa-form")).toBeInTheDocument();
    expect(onLoginResponse).not.toHaveBeenCalled();
  });

  test("lets the user switch MFA method before completing WeCom sign-in", async() => {
    jest.useFakeTimers();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {status: "authorized", expiresAt: "2026-06-04T12:05:00Z"},
    });
    AuthBackend.completeWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: "NextMfa",
      data2: [{mfaType: "totp", isPreferred: true}, {mfaType: "email"}],
    });

    const {getByText, getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
    expect(getByTestId("wecom-mfa-form")).toBeInTheDocument();

    fireEvent.click(getByText("email"));
    expect(getByTestId("wecom-mfa-form")).toBeInTheDocument();
  });

  test("shows expired state when polling reports the intent expired", async() => {
    jest.useFakeTimers();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {status: "expired", errorText: "scan expired"},
    });

    const {getByText, getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(getByText("scan expired")).toBeInTheDocument();
    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-status", "expired");
  });

  test("marks the QR code as scanned when polling reports completion", async() => {
    jest.useFakeTimers();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {status: "completed"},
    });

    const {getByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-status", "scanned");
  });

  test("shows polling and completion errors without logging in", async() => {
    jest.useFakeTimers();
    const onLoginResponse = jest.fn();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValueOnce({
      status: "error",
      msg: "poll failed",
    });

    const {getByText, rerender} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
        onLoginResponse={onLoginResponse}
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
    expect(getByText("poll failed")).toBeInTheDocument();

    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-2",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-2",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValueOnce({
      status: "ok",
      data: {status: "authorized"},
    });
    AuthBackend.completeWecomProfileConsentLoginIntent.mockResolvedValueOnce({
      status: "error",
      msg: "complete failed",
    });

    rerender(
      <WeComLoginPanel
        application={{...internalWeComApplication}}
        loginMethod="wecom"
        onLoginResponse={onLoginResponse}
      />
    );
    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(getByText("complete failed")).toBeInTheDocument();
    expect(onLoginResponse).not.toHaveBeenCalled();
  });

  test("shows an error when polling the authorization intent rejects", async() => {
    jest.useFakeTimers();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockRejectedValue(new Error("poll network failed"));

    const {getByText} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(getByText("poll network failed")).toBeInTheDocument();
  });

  test("loads the embedded WeCom QR widget only from the compatible fallback action", async() => {
    const script = document.createElement("script");
    script.dataset.wecomLoginWidget = "true";
    document.head.appendChild(script);
    window.WwLogin = jest.fn();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    Provider.getAuthUrl.mockReturnValue("https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo");

    const {getByText, queryByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(window.WwLogin).not.toHaveBeenCalled();
    expect(queryByTestId("wecom-oauth-qrcode")).toBeInTheDocument();

    fireEvent.click(getByText("Use compatible web login"));
    await flushEffects();

    expect(queryByTestId("wecom-oauth-qrcode")).toBeNull();
    expect(getByText("Return to authorization login")).toBeInTheDocument();
    expect(window.WwLogin).toHaveBeenCalledWith(expect.objectContaining({
      appid: "wx-test-appid",
      agentid: "1000002",
      redirect_uri: "https://example.com/callback",
      state: "test-state",
      scope: "snsapi_privateinfo",
    }));

    fireEvent.click(getByText("Refresh"));
    await flushEffects();
    expect(window.WwLogin).toHaveBeenCalledTimes(2);
  });

  test("shows an error when the compatible fallback login URL cannot be parsed", async() => {
    Provider.getAuthUrl.mockReturnValue("not-a-valid-wecom-url");
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    const {getByText} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    fireEvent.click(getByText("Use compatible web login"));
    await flushEffects();

    expect(getByText("Failed to generate WeCom login URL")).toBeInTheDocument();
    expect(getByText("Return to authorization login")).toBeInTheDocument();
  });

  test("returns to the authorization QR code from compatible fallback", async() => {
    const script = document.createElement("script");
    script.dataset.wecomLoginWidget = "true";
    document.head.appendChild(script);
    window.WwLogin = jest.fn();
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });

    const {getByText, getByTestId, queryByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    fireEvent.click(getByText("Use compatible web login"));
    await flushEffects();
    expect(queryByTestId("wecom-oauth-qrcode")).toBeNull();

    fireEvent.click(getByText("Return to authorization login"));
    await flushEffects();
    expect(getByTestId("wecom-oauth-qrcode")).toBeInTheDocument();
  });

  test("does not restart consent polling when switching to fallback before intent creation returns", async() => {
    jest.useFakeTimers();
    const script = document.createElement("script");
    script.dataset.wecomLoginWidget = "true";
    document.head.appendChild(script);
    window.WwLogin = jest.fn();

    let resolveIntent;
    AuthBackend.createWecomProfileConsentLoginIntent.mockReturnValue(new Promise(resolve => {
      resolveIntent = resolve;
    }));

    const {getByText, queryByTestId} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    fireEvent.click(getByText("Use compatible web login"));
    await flushEffects();

    expect(queryByTestId("wecom-oauth-qrcode")).toBeNull();
    expect(getByText("Return to authorization login")).toBeInTheDocument();

    await act(async() => {
      resolveIntent({
        status: "ok",
        data: {
          intentId: "intent-1",
          authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
          expiresAt: "2026-06-04T12:05:00Z",
          pollToken: "poll-token-1",
        },
      });
      await Promise.resolve();
    });
    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(queryByTestId("wecom-oauth-qrcode")).toBeNull();
    expect(AuthBackend.getWecomProfileConsentIntentStatus).not.toHaveBeenCalled();
  });
});
