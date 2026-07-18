import {afterEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {act, render} from "@testing-library/react";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockRejectedValue: (value: unknown) => LooseMock;
};
type JestDomMatchers = {
  toHaveAttribute: (name: string, value?: unknown) => void;
  toBeInTheDocument: () => void;
};

const mockCreateWecomProfileConsentProfileSyncIntent = vi.fn() as unknown as LooseMock;
const mockGetWecomProfileConsentIntentStatus = vi.fn() as unknown as LooseMock;

vi.mock("i18next", () => {
  const t = (key: string) => {
    const [, value] = key.split(":");
    return value || key;
  };
  return {default: {t}, t};
});

vi.mock("antd", async() => {
  const ReactFactory = await vi.importActual<typeof import("react")>("react");
  return {
    Alert: ({message}: {message: string}) => ReactFactory.createElement("div", null, message),
    Button: ({children, disabled, onClick}: {children?: React.ReactNode; disabled?: boolean; onClick?: () => void}) => ReactFactory.createElement("button", {type: "button", disabled, onClick}, children),
    Modal: ({children, footer, open, title}: {children?: React.ReactNode; footer?: React.ReactNode; open?: boolean; title?: string}) => open ? ReactFactory.createElement("div", null, title, children, footer) : null,
    QRCode: ({value, status}: {value: string; status: string}) => ReactFactory.createElement("div", {"data-testid": "wecom-profile-sync-qrcode", "data-value": value, "data-status": status}),
    Space: ({children}: {children?: React.ReactNode}) => ReactFactory.createElement("div", null, children),
    Spin: () => ReactFactory.createElement("div", null, "loading"),
  };
});

import WeComProfileSyncPanel from "./WeComProfileSyncPanel";
import {fireEvent} from "@testing-library/react";

vi.mock("../auth/AuthBackend", () => ({
  createWecomProfileConsentProfileSyncIntent: (...args: unknown[]) => mockCreateWecomProfileConsentProfileSyncIntent(...args),
  getWecomProfileConsentIntentStatus: (...args: unknown[]) => mockGetWecomProfileConsentIntentStatus(...args),
}));

const expectElement = (element: Element): JestDomMatchers => expect(element) as unknown as JestDomMatchers;

describe("WeComProfileSyncPanel", () => {
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
          clientSecret: "secret",
          appId: "1000002",
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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("creates sync intent, renders QR code, polls completion and refreshes profile", async() => {
    vi.useFakeTimers();
    const onSynced = vi.fn();
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-sync-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    mockGetWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {
        status: "completed",
        expiresAt: "2026-06-04T12:05:00Z",
      },
    });

    const {getByText, getByTestId} = render(
      <WeComProfileSyncPanel application={application} onSynced={onSynced} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    expect(mockCreateWecomProfileConsentProfileSyncIntent).toHaveBeenCalledWith({
      application: "app-built-in",
      provider: "built-in/wecom-internal",
    });
    expectElement(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-value", "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo");

    await act(async() => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(mockGetWecomProfileConsentIntentStatus).toHaveBeenCalledWith("intent-sync-1", "poll-token-1");
    expect(onSynced).toHaveBeenCalled();
    expectElement(getByText("WeCom profile synced")).toBeInTheDocument();
  });

  test("shows backend error when sync intent cannot be created", async() => {
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "error",
      msg: "wecom profile consent user has no linked WeCom identity",
    });

    const {getByText} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    expectElement(getByText("wecom profile consent user has no linked WeCom identity")).toBeInTheDocument();
  });

  test("falls back to generic error when sync intent response misses required data", async() => {
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-without-qr",
      },
    });

    const {getByText} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    expectElement(getByText("WeCom profile sync failed. Please retry")).toBeInTheDocument();
  });

  test("shows thrown sync intent errors", async() => {
    mockCreateWecomProfileConsentProfileSyncIntent.mockRejectedValue(new Error("create intent failed"));

    const {getByText} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    expectElement(getByText("create intent failed")).toBeInTheDocument();
  });

  test("reports missing WeCom sync provider before calling backend", async() => {
    const {getByText} = render(
      <WeComProfileSyncPanel application={{name: "app-built-in", providers: []}} onSynced={vi.fn()} />
    );

    const syncButton = getByText("Sync WeCom profile");
    expectElement(syncButton).toHaveAttribute("disabled");
    fireEvent.click(syncButton);
    await flushEffects();

    expect(mockCreateWecomProfileConsentProfileSyncIntent).not.toHaveBeenCalled();
  });

  test("reports incomplete WeCom sync provider configuration", async() => {
    const incompleteApplication = {
      ...application,
      providers: [
        {
          provider: {
            ...application.providers[0].provider,
            clientSecret: "",
          },
        },
      ],
    };
    const {getByText} = render(
      <WeComProfileSyncPanel application={incompleteApplication} onSynced={vi.fn()} />
    );

    const syncButton = getByText("Sync WeCom profile");
    expectElement(syncButton).toHaveAttribute("disabled");
    fireEvent.click(syncButton);
    await flushEffects();

    expect(mockCreateWecomProfileConsentProfileSyncIntent).not.toHaveBeenCalled();
  });

  test("renders expired poll status and error text", async() => {
    vi.useFakeTimers();
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-expired",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-expired",
      },
    });
    mockGetWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {
        status: "expired",
        errorText: "wecom qr code expired",
      },
    });

    const {getByText, getByTestId} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    await act(async() => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(mockGetWecomProfileConsentIntentStatus).toHaveBeenCalledWith("intent-expired", "poll-token-expired");
    expectElement(getByText("WeCom profile sync QR code expired")).toBeInTheDocument();
    expectElement(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-status", "expired");
  });

  test("keeps QR code active while poll status is pending", async() => {
    vi.useFakeTimers();
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-pending",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-pending",
      },
    });
    mockGetWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "ok",
      data: {},
    });

    const {getByText, getByTestId} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    await act(async() => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expectElement(getByText("Use WeCom to scan the QR code and consent to sync profile")).toBeInTheDocument();
    expectElement(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-status", "active");
  });

  test("shows poll error returned by backend", async() => {
    vi.useFakeTimers();
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-error",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-error",
      },
    });
    mockGetWecomProfileConsentIntentStatus.mockResolvedValue({
      status: "error",
      msg: "poll token rejected",
    });

    const {getByText, getByTestId} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    await act(async() => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expectElement(getByText("poll token rejected")).toBeInTheDocument();
    expectElement(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-status", "expired");
  });

  test("shows thrown poll errors", async() => {
    vi.useFakeTimers();
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-poll-throws",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-throws",
      },
    });
    mockGetWecomProfileConsentIntentStatus.mockRejectedValue(new Error("poll failed"));

    const {getByText, getByTestId} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    await act(async() => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expectElement(getByText("poll failed")).toBeInTheDocument();
    expectElement(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-status", "expired");
  });

  test("closes and refreshes the sync modal without changing provider payload", async() => {
    mockCreateWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-refresh",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-refresh",
      },
    });

    const {getByText, getByTestId, queryByTestId} = render(
      <WeComProfileSyncPanel application={application} onSynced={vi.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();
    expectElement(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-status", "active");

    fireEvent.click(getByText("Close"));
    await flushEffects();
    expect(queryByTestId("wecom-profile-sync-qrcode")).toBeNull();

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();
    fireEvent.click(getByText("Refresh"));
    await flushEffects();

    expect(mockCreateWecomProfileConsentProfileSyncIntent).toHaveBeenCalledTimes(3);
    expect(mockCreateWecomProfileConsentProfileSyncIntent).toHaveBeenLastCalledWith({
      application: "app-built-in",
      provider: "built-in/wecom-internal",
    });
  });
});
