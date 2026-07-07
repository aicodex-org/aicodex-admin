/* eslint-env jest */
import React from "react";
import {jest, expect as jestExpect} from "@jest/globals";
import {act, render} from "@testing-library/react";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValue: (value: unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
};

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
  toHaveAttribute: (name: string, value?: unknown) => void;
  toHaveStyle: (style: string | Record<string, unknown>) => void;
  not: ReturnType<typeof jestExpect> & {
    toHaveBeenCalled: () => void;
    toBeInTheDocument: () => void;
  };
};

type TestExpect = {
  (actual: unknown): DomMatcherResult;
  objectContaining: typeof jestExpect.objectContaining;
};

const expect = jestExpect as unknown as TestExpect;

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element) => boolean;
  };
};

type MockQrCodeProps = {
  value?: string;
  status?: string;
  size?: number;
  style?: React.CSSProperties;
};

type WeComIntentTestResponse = {
  status: string;
  msg?: string;
  data?: {
    intentId?: string;
    authUrl?: string;
    shortAuthUrl?: string;
    expiresAt?: string;
    pollToken?: string;
    status?: string;
    errorCode?: string;
    errorText?: string;
  } | string;
  data2?: Array<{
    mfaType?: string;
    isPreferred?: boolean;
  }>;
};

jest.mock("i18next", () => ({
  t: (key: string) => {
    const [, value] = key.split(":");
    return value || key;
  },
}));

jest.mock("antd", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jest};
  const actual = factoryJest.requireActual("antd") as typeof import("antd");
  return {
    ...actual,
    QRCode: ({value, status, size, style}: MockQrCodeProps) => (
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

jest.mock("./AuthBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jest};
  return {
    createWecomProfileConsentLoginIntent: factoryJest.fn(),
    getWecomProfileConsentIntentStatus: factoryJest.fn(),
    completeWecomProfileConsentLoginIntent: factoryJest.fn(),
  };
});

jest.mock("./Provider", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jest};
  return {
    getAuthUrl: factoryJest.fn(() => "https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo"),
  };
});

const createWecomProfileConsentLoginIntentMock = AuthBackend.createWecomProfileConsentLoginIntent as unknown as LooseMock;
const getWecomProfileConsentIntentStatusMock = AuthBackend.getWecomProfileConsentIntentStatus as unknown as LooseMock;
const completeWecomProfileConsentLoginIntentMock = AuthBackend.completeWecomProfileConsentLoginIntent as unknown as LooseMock;
const getAuthUrlMock = Provider.getAuthUrl as unknown as LooseMock;

function installMockWeComWidget(): LooseMock {
  const wwLoginMock = jest.fn() as unknown as LooseMock;
  window.WwLogin = wwLoginMock as unknown as Window["WwLogin"];
  return wwLoginMock;
}

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
    getAuthUrlMock.mockReturnValue(defaultWeComWidgetAuthUrl);
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    expect(createWecomProfileConsentLoginIntentMock).toHaveBeenCalledWith({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    expect(createWecomProfileConsentLoginIntentMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "built-in/wecom-internal",
      returnUrl: "/login/oauth/authorize?client_id=app-built-in",
    }));
  });

  test("keeps the OAuth2 QR code complete with quiet-zone padding", async() => {
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    expect(createWecomProfileConsentLoginIntentMock).toHaveBeenCalledTimes(2);
  });

  test("shows expired status text when polling reports expiration without detail", async() => {
    jest.useFakeTimers();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockRejectedValue(new Error("network failed"));

    const {getByText} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(getByText("network failed")).toBeInTheDocument();
  });

  test("normalizes non-Error rejection messages", async() => {
    createWecomProfileConsentLoginIntentMock.mockRejectedValue({message: "object message failed"});

    const {getByText, rerender} = render(
      <WeComLoginPanel
        application={internalWeComApplication}
        loginMethod="wecom"
      />
    );
    await flushEffects();
    expect(getByText("object message failed")).toBeInTheDocument();

    createWecomProfileConsentLoginIntentMock.mockRejectedValue("string rejection");
    rerender(
      <WeComLoginPanel
        application={{...internalWeComApplication}}
        loginMethod="wecom"
      />
    );
    await flushEffects();
    expect(getByText("Failed to create WeCom authorization QR code")).toBeInTheDocument();
  });

  test("polls authorization status and completes login after authorization", async() => {
    jest.useFakeTimers();
    const onLoginResponse = jest.fn();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
      status: "ok",
      data: {status: "authorized", expiresAt: "2026-06-04T12:05:00Z"},
    });
    completeWecomProfileConsentLoginIntentMock.mockResolvedValue({
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

    expect(getWecomProfileConsentIntentStatusMock).toHaveBeenCalledWith("intent-1", "poll-token-1");
    expect(completeWecomProfileConsentLoginIntentMock).toHaveBeenCalledWith("intent-1", "poll-token-1", {});
    expect(onLoginResponse).toHaveBeenCalledWith({status: "ok", data: "/"});
  });

  test("shows MFA form when intent completion requires MFA", async() => {
    jest.useFakeTimers();
    const onLoginResponse = jest.fn();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
      status: "ok",
      data: {status: "authorized", expiresAt: "2026-06-04T12:05:00Z"},
    });
    completeWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
      status: "ok",
      data: {status: "authorized", expiresAt: "2026-06-04T12:05:00Z"},
    });
    completeWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
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

  test("shows email permission guidance when WeCom did not return email", async() => {
    jest.useFakeTimers();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
      status: "ok",
      data: {
        status: "failed",
        errorCode: "wecom_profile_email_permission_required",
      },
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

    expect(getByText("WeCom email permission is required. Enable email in WeCom personal sensitive information management, then scan again")).toBeInTheDocument();
    expect(getByTestId("wecom-oauth-qrcode")).toHaveAttribute("data-status", "expired");
  });

  test("marks the QR code as scanned when polling reports completion", async() => {
    jest.useFakeTimers();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValue({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValueOnce({
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

    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-2",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-2",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockResolvedValueOnce({
      status: "ok",
      data: {status: "authorized"},
    });
    completeWecomProfileConsentLoginIntentMock.mockResolvedValueOnce({
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
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getWecomProfileConsentIntentStatusMock.mockRejectedValue(new Error("poll network failed"));

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
    installMockWeComWidget();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    getAuthUrlMock.mockReturnValue("https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo");

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
    getAuthUrlMock.mockReturnValue("not-a-valid-wecom-url");
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    installMockWeComWidget();
    createWecomProfileConsentLoginIntentMock.mockResolvedValue({
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
    installMockWeComWidget();

    let resolveIntent: (value: WeComIntentTestResponse) => void = () => {};
    createWecomProfileConsentLoginIntentMock.mockReturnValue(new Promise<WeComIntentTestResponse>(resolve => {
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
    expect(getWecomProfileConsentIntentStatusMock).not.toHaveBeenCalled();
  });
});
