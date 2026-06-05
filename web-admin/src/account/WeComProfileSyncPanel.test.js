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
    QRCode: ({value, status}) => <div data-testid="wecom-profile-sync-qrcode" data-value={value} data-status={status} />,
  };
});

import WeComProfileSyncPanel from "./WeComProfileSyncPanel";
import * as AuthBackend from "../auth/AuthBackend";

jest.mock("../auth/AuthBackend", () => ({
  createWecomProfileConsentProfileSyncIntent: jest.fn(),
  getWecomProfileConsentIntentStatus: jest.fn(),
}));

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
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("creates sync intent, renders QR code, polls completion and refreshes profile", async() => {
    jest.useFakeTimers();
    const onSynced = jest.fn();
    AuthBackend.createWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "ok",
      data: {
        intentId: "intent-sync-1",
        authUrl: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo",
        expiresAt: "2026-06-04T12:05:00Z",
        pollToken: "poll-token-1",
      },
    });
    AuthBackend.getWecomProfileConsentIntentStatus.mockResolvedValue({
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

    expect(AuthBackend.createWecomProfileConsentProfileSyncIntent).toHaveBeenCalledWith({
      application: "app-built-in",
      provider: "built-in/wecom-internal",
    });
    expect(getByTestId("wecom-profile-sync-qrcode")).toHaveAttribute("data-value", "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo");

    await act(async() => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(AuthBackend.getWecomProfileConsentIntentStatus).toHaveBeenCalledWith("intent-sync-1", "poll-token-1");
    expect(onSynced).toHaveBeenCalled();
    expect(getByText("WeCom profile synced")).toBeInTheDocument();
  });

  test("shows backend error when sync intent cannot be created", async() => {
    AuthBackend.createWecomProfileConsentProfileSyncIntent.mockResolvedValue({
      status: "error",
      msg: "wecom profile consent user has no linked WeCom identity",
    });

    const {getByText} = render(
      <WeComProfileSyncPanel application={application} onSynced={jest.fn()} />
    );

    fireEvent.click(getByText("Sync WeCom profile"));
    await flushEffects();

    expect(getByText("wecom profile consent user has no linked WeCom identity")).toBeInTheDocument();
  });
});
