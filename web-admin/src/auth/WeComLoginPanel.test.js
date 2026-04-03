/* eslint-env jest */
import React from "react";
import {render} from "@testing-library/react";

jest.mock("i18next", () => ({
  t: key => {
    const [, value] = key.split(":");
    return value || key;
  },
}));

import WeComLoginPanel from "./WeComLoginPanel";

jest.mock("./Provider", () => ({
  getAuthUrl: jest.fn(() => "https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&redirect_uri=https://example.com/callback&state=test-state"),
}));

describe("WeComLoginPanel", () => {
  async function flushEffects() {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

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
});
