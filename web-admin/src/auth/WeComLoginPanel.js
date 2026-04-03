// Copyright 2026 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import {Alert, Button, Spin} from "antd";
import i18next from "i18next";
import * as Provider from "./Provider";

const WeComWidgetScript = "https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wwLogin-1.2.7.js";

let widgetScriptPromise = null;

function loadWidgetScript() {
  if (!widgetScriptPromise) {
    widgetScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-wecom-login-widget='true']");
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = WeComWidgetScript;
      script.async = true;
      script.dataset.wecomLoginWidget = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(i18next.t("login:Failed to load WeCom QR code widget")));
      document.head.appendChild(script);
    });
  }

  return widgetScriptPromise;
}

class WeComLoginPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "loading",
      authUrl: "",
      errorMessage: "",
    };
    this.mountId = `wecom-login-widget-${Math.random().toString(36).slice(2, 10)}`;
  }

  componentDidMount() {
    this.prepareWidget();
  }

  componentDidUpdate(prevProps) {
    if (this.props.loginMethod === "wecom" && prevProps.loginMethod !== "wecom") {
      this.prepareWidget();
      return;
    }

    if (prevProps.application !== this.props.application || prevProps.providerId !== this.props.providerId) {
      this.prepareWidget();
    }

    if (prevProps.loginMethod === "wecom" && this.props.loginMethod !== "wecom") {
      this.clearWidget();
    }
  }

  componentWillUnmount() {
    this.clearWidget();
  }

  getWeComProviderItem() {
    const {application, providerId} = this.props;
    const providers = application?.providers || [];
    const visibleProviders = providers.filter(item => item?.provider?.type === "WeCom");

    if (providerId) {
      return visibleProviders.find(item => `${item.provider.owner}/${item.provider.name}` === providerId) || null;
    }

    return visibleProviders.find(item => item.provider?.subType === "Internal" && item.provider?.method === "Normal")
      || visibleProviders[0]
      || null;
  }

  getWidgetParams(providerItem) {
    if (!providerItem?.provider) {
      return {errorMessage: i18next.t("login:WeCom login is not configured for the current application")};
    }

    const provider = providerItem.provider;
    if (provider.subType !== "Internal" || provider.method !== "Normal") {
      return {
        errorMessage: i18next.t("login:Homepage WeCom QR login currently supports Internal + Normal mode only"),
        authUrl: Provider.getAuthUrl(this.props.application, provider, "signup"),
      };
    }

    if (!provider.clientId || !provider.clientSecret || !provider.appId) {
      return {
        errorMessage: i18next.t("login:WeCom login configuration is incomplete. Please check Corp ID, Secret and Agent ID"),
      };
    }

    const authUrl = Provider.getAuthUrl(this.props.application, provider, "signup");
    let parsedUrl;
    try {
      parsedUrl = new URL(authUrl);
    } catch {
      return {
        authUrl,
        errorMessage: i18next.t("login:Failed to generate WeCom login URL"),
      };
    }

    return {
      authUrl,
      widget: {
        appid: parsedUrl.searchParams.get("appid") || provider.clientId,
        agentid: parsedUrl.searchParams.get("agentid") || provider.appId,
        redirectUri: parsedUrl.searchParams.get("redirect_uri") || `${window.location.origin}/callback`,
        state: parsedUrl.searchParams.get("state") || "",
      },
    };
  }

  clearWidget() {
    const mountPoint = document.getElementById(this.mountId);
    if (mountPoint) {
      mountPoint.innerHTML = "";
    }
  }

  async prepareWidget() {
    const providerItem = this.getWeComProviderItem();
    const {authUrl, widget, errorMessage} = this.getWidgetParams(providerItem);

    this.setState({
      status: widget ? "loading" : "error",
      authUrl: authUrl || "",
      errorMessage: errorMessage || "",
    });

    this.clearWidget();

    if (!widget) {
      return;
    }

    try {
      await loadWidgetScript();
      const mountPoint = document.getElementById(this.mountId);
      if (!mountPoint) {
        return;
      }

      const widgetFactory = window.WwLogin;
      if (!widgetFactory) {
        throw new Error(i18next.t("login:Failed to load WeCom QR code widget"));
      }

      mountPoint.innerHTML = "";
      new widgetFactory({
        id: this.mountId,
        appid: widget.appid,
        agentid: widget.agentid,
        redirect_uri: widget.redirectUri,
        state: widget.state,
        self_redirect: false,
      });

      this.setState({
        status: "active",
        errorMessage: "",
      });
    } catch (error) {
      this.setState({
        status: "error",
        errorMessage: error?.message || i18next.t("login:Failed to load WeCom QR code widget"),
      });
    }
  }

  renderHint() {
    if (this.state.errorMessage) {
      return (
        <Alert
          type="warning"
          showIcon
          message={this.state.errorMessage}
          style={{textAlign: "left", marginBottom: 16}}
        />
      );
    }

    return (
      <div style={{textAlign: "center", color: "rgba(0, 0, 0, 0.65)", marginBottom: 12}}>
        {i18next.t("login:Use WeCom to scan the QR code and sign in")}
      </div>
    );
  }

  render() {
    const {loginWidth = 320} = this.props;

    return (
      <div style={{width: loginWidth, margin: "0 auto", textAlign: "center", marginTop: 16}}>
        {this.renderHint()}
        <div
          style={{
            minHeight: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: "#ffffff",
          }}
        >
          {this.state.status === "loading" ? <Spin /> : null}
          <div id={this.mountId} style={{display: this.state.status === "active" ? "block" : "none"}} />
        </div>
        <div style={{marginTop: 12, display: "flex", justifyContent: "center", gap: 12}}>
          <Button onClick={() => this.prepareWidget()}>
            {i18next.t("login:Refresh")}
          </Button>
          {this.state.authUrl ? (
            <Button type="primary" onClick={() => window.location.assign(this.state.authUrl)}>
              {i18next.t("login:Launch WeCom login")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
}

export default WeComLoginPanel;
