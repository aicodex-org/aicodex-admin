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
import * as Provider from "./Provider";

jest.mock("./Provider", () => ({
  getAuthUrl: jest.fn(() => "https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo"),
}));

describe("WeComLoginPanel", () => {
  async function flushEffects() {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  afterEach(() => {
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

  test("passes provider scope to embedded WeCom QR widget", async() => {
    const script = document.createElement("script");
    script.dataset.wecomLoginWidget = "true";
    document.head.appendChild(script);
    window.WwLogin = jest.fn();
    Provider.getAuthUrl.mockReturnValue("https://login.work.weixin.qq.com/wwlogin/sso/login?appid=wx-test-appid&agentid=1000002&redirect_uri=https://example.com/callback&state=test-state&scope=snsapi_privateinfo");
    const application = {
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

    render(
      <WeComLoginPanel
        application={application}
        loginMethod="wecom"
      />
    );

    await flushEffects();
    expect(window.WwLogin).toHaveBeenCalledWith(expect.objectContaining({
      appid: "wx-test-appid",
      agentid: "1000002",
      redirect_uri: "https://example.com/callback",
      state: "test-state",
      scope: "snsapi_privateinfo",
    }));
  });
});
