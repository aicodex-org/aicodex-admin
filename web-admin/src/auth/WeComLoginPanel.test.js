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
    QRCode: ({value, status}) => <div data-testid="wecom-oauth-qrcode" data-value={value} data-status={status} />,
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

  test("creates a profile consent intent and renders the OAuth2 QR code as the primary path", async() => {
    AuthBackend.createWecomProfileConsentLoginIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
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
    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-value", "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo");
    expect(window.WwLogin).toBeUndefined();
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
