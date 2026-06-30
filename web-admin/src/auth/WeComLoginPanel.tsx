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
import {Alert, Button, QRCode, Spin} from "antd";
import i18next from "i18next";
import * as AuthBackend from "./AuthBackend";
import * as Provider from "./Provider";
import {MfaAuthVerifyForm, NextMfa} from "./mfa/MfaAuthVerifyForm";
import type {ApplicationProviderItem, AuthApplication} from "./AuthTypes";

const t = (key: string): string => i18next.t(key) as string;

const WeComWidgetScript = "https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wwLogin-1.2.7.js";
// 企业微信 OAuth2 URL 较长，二维码需要显式静区，避免边缘贴边影响扫码识别。
const WeComOAuthQRCodeSize = 256;
const WeComOAuthQRCodeQuietZone = 12;
const WeComOAuthScanPanelMinHeight = WeComOAuthQRCodeSize + WeComOAuthQRCodeQuietZone * 2 + 20;

interface WeComLoginWidgetOptions {
  id: string;
  appid: string;
  agentid: string;
  redirect_uri: string;
  state: string;
  self_redirect: boolean;
  scope?: string;
}

declare global {
  interface Window {
    WwLogin?: new (options: WeComLoginWidgetOptions) => unknown;
  }
}

type WeComPanelStatus = "loading" | "failed" | "pending" | "authorized" | "expired" | "completed" | "mfa_pending";
type WeComFallbackStatus = "idle" | "loading" | "active" | "error";
type WeComQrCodeStatus = "active" | "expired" | "loading" | "scanned";

interface WeComLoginContext {
  type?: string;
  method?: string;
  signinMethod?: string;
  [key: string]: unknown;
}

interface WeComLoginResponse {
  status: string;
  msg?: string;
  [key: string]: unknown;
}

interface WeComIntentPayload {
  application: string;
  provider: string;
  method: string;
  returnUrl: string;
  loginContext: WeComLoginContext;
}

interface WeComWidgetParams {
  authUrl?: string;
  widget?: {
    appid: string;
    agentid: string;
    redirectUri: string;
    state: string;
    scope: string;
  };
  errorMessage?: string;
}

interface MfaProp {
  mfaType?: string;
  isPreferred?: boolean;
  [key: string]: unknown;
}

interface WeComProviderItem extends ApplicationProviderItem {
  provider: NonNullable<ApplicationProviderItem["provider"]>;
}

interface WeComLoginPanelProps {
  application?: AuthApplication;
  providerId?: string;
  loginMethod?: string;
  loginWidth?: number;
  getLoginContext?: () => WeComLoginContext | null | undefined;
  getReturnUrl?: () => string;
  onLoginResponse?: (res: WeComLoginResponse) => void;
}

interface WeComLoginPanelState {
  status: WeComPanelStatus;
  authUrl: string;
  expiresAt: string;
  intentId: string;
  pollToken: string;
  errorMessage: string;
  fallbackMode: boolean;
  fallbackStatus: WeComFallbackStatus;
  fallbackErrorMessage: string;
  mfaProps: MfaProp[] | null;
  selectedMfaProp: MfaProp | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

let widgetScriptPromise: Promise<void> | null = null;

function loadWidgetScript(): Promise<void> {
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
      script.onerror = () => reject(new Error(t("login:Failed to load WeCom QR code widget")));
      document.head.appendChild(script);
    });
  }

  return widgetScriptPromise;
}

class WeComLoginPanel extends React.Component<WeComLoginPanelProps, WeComLoginPanelState> {
  private mountId: string;
  private pollingTimer: ReturnType<typeof setInterval> | null;
  private pollInFlight: boolean;
  private completing: boolean;
  private intentRequestSeq: number;

  constructor(props: WeComLoginPanelProps) {
    super(props);
    this.state = {
      status: "loading",
      authUrl: "",
      expiresAt: "",
      intentId: "",
      pollToken: "",
      errorMessage: "",
      fallbackMode: false,
      fallbackStatus: "idle",
      fallbackErrorMessage: "",
      mfaProps: null,
      selectedMfaProp: null,
    };
    this.mountId = `wecom-login-widget-${Math.random().toString(36).slice(2, 10)}`;
    this.pollingTimer = null;
    this.pollInFlight = false;
    this.completing = false;
    this.intentRequestSeq = 0;
  }

  componentDidMount() {
    this.prepareConsentIntent();
  }

  componentDidUpdate(prevProps: WeComLoginPanelProps) {
    if (this.props.loginMethod === "wecom" && prevProps.loginMethod !== "wecom") {
      this.prepareConsentIntent();
      return;
    }

    if (prevProps.application !== this.props.application || prevProps.providerId !== this.props.providerId) {
      this.prepareConsentIntent();
    }

    if (prevProps.loginMethod === "wecom" && this.props.loginMethod !== "wecom") {
      this.clearPolling();
      this.clearWidget();
    }
  }

  componentWillUnmount() {
    this.clearPolling();
    this.clearWidget();
  }

  getWeComProviderItem() {
    const {application, providerId} = this.props;
    const providers = application?.providers || [];
    const visibleProviders = providers.filter((item: ApplicationProviderItem): item is WeComProviderItem => item?.provider?.type === "WeCom");

    if (providerId) {
      return visibleProviders.find(item => `${item.provider.owner}/${item.provider.name}` === providerId) || null;
    }

    return visibleProviders.find(item => item.provider?.subType === "Internal" && item.provider?.method === "Normal")
      || visibleProviders[0]
      || null;
  }

  getProviderId(providerItem: ApplicationProviderItem | null): string {
    if (!providerItem?.provider) {
      return "";
    }
    return `${providerItem.provider.owner}/${providerItem.provider.name}`;
  }

  getConsentProviderError(providerItem: ApplicationProviderItem | null): string {
    if (!providerItem?.provider) {
      return t("login:WeCom login is not configured for the current application");
    }

    const provider = providerItem.provider;
    if (provider.subType !== "Internal" || provider.method !== "Normal") {
      return t("login:Homepage WeCom QR login currently supports Internal + Normal mode only");
    }

    if (!provider.clientId || !provider.clientSecret || !provider.appId) {
      return t("login:WeCom login configuration is incomplete. Please check Corp ID, Secret and Agent ID");
    }

    return "";
  }

  getLoginContext(): WeComLoginContext {
    if (this.props.getLoginContext) {
      return this.props.getLoginContext() || {};
    }

    return {
      type: "login",
      method: "signup",
      signinMethod: "wecom",
    };
  }

  getReturnUrl(): string {
    if (this.props.getReturnUrl) {
      return this.props.getReturnUrl();
    }
    return window.location.pathname + window.location.search;
  }

  getIntentPayload(providerItem: ApplicationProviderItem | null): WeComIntentPayload {
    const loginContext = {
      method: "signup",
      signinMethod: "wecom",
      ...this.getLoginContext(),
    };
    return {
      application: this.props.application?.name || "",
      provider: this.getProviderId(providerItem),
      method: loginContext.method || "signup",
      returnUrl: this.getReturnUrl(),
      loginContext,
    };
  }

  getWidgetParams(providerItem: ApplicationProviderItem | null): WeComWidgetParams {
    if (!providerItem?.provider) {
      return {errorMessage: t("login:WeCom login is not configured for the current application")};
    }

    const provider = providerItem.provider;
    if (provider.subType !== "Internal" || provider.method !== "Normal") {
      return {
        errorMessage: t("login:Homepage WeCom QR login currently supports Internal + Normal mode only"),
        authUrl: Provider.getAuthUrl(this.props.application ?? null, provider, "signup") as string,
      };
    }

    if (!provider.clientId || !provider.clientSecret || !provider.appId) {
      return {
        errorMessage: t("login:WeCom login configuration is incomplete. Please check Corp ID, Secret and Agent ID"),
      };
    }

    const authUrl = Provider.getAuthUrl(this.props.application ?? null, provider, "signup") as string;
    let parsedUrl;
    try {
      parsedUrl = new URL(authUrl);
    } catch {
      return {
        authUrl,
        errorMessage: t("login:Failed to generate WeCom login URL"),
      };
    }

    return {
      authUrl,
      widget: {
        appid: parsedUrl.searchParams.get("appid") || provider.clientId,
        agentid: parsedUrl.searchParams.get("agentid") || provider.appId,
        redirectUri: parsedUrl.searchParams.get("redirect_uri") || `${window.location.origin}/callback`,
        state: parsedUrl.searchParams.get("state") || "",
        scope: parsedUrl.searchParams.get("scope") || provider.scopes || "",
      },
    };
  }

  clearPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  clearWidget() {
    const mountPoint = document.getElementById(this.mountId);
    if (mountPoint) {
      mountPoint.innerHTML = "";
    }
  }

  async prepareConsentIntent() {
    const requestSeq = ++this.intentRequestSeq;
    this.clearPolling();
    this.clearWidget();
    const providerItem = this.getWeComProviderItem();
    const errorMessage = this.getConsentProviderError(providerItem);
    if (errorMessage) {
      this.setState({
        status: "failed",
        authUrl: "",
        expiresAt: "",
        intentId: "",
        pollToken: "",
        errorMessage,
        fallbackMode: false,
        fallbackStatus: "idle",
        fallbackErrorMessage: "",
        mfaProps: null,
        selectedMfaProp: null,
      });
      return;
    }

    this.setState({
      status: "loading",
      authUrl: "",
      expiresAt: "",
      intentId: "",
      pollToken: "",
      errorMessage: "",
      fallbackMode: false,
      fallbackStatus: "idle",
      fallbackErrorMessage: "",
      mfaProps: null,
      selectedMfaProp: null,
    });

    try {
      const res = await AuthBackend.createWecomProfileConsentLoginIntent(this.getIntentPayload(providerItem));
      if (requestSeq !== this.intentRequestSeq) {
        return;
      }
      if (res.status !== "ok" || !res.data?.intentId || !res.data?.authUrl || !res.data?.pollToken) {
        this.setState({
          status: "failed",
          errorMessage: res.msg || t("login:Failed to create WeCom authorization QR code"),
        });
        return;
      }

      this.setState({
        status: "pending",
        authUrl: res.data.shortAuthUrl || res.data.authUrl,
        expiresAt: res.data.expiresAt,
        intentId: res.data.intentId,
        pollToken: res.data.pollToken,
        errorMessage: "",
      }, () => this.startPolling());
    } catch (error) {
      if (requestSeq !== this.intentRequestSeq) {
        return;
      }
      this.setState({
        status: "failed",
        errorMessage: getErrorMessage(error, t("login:Failed to create WeCom authorization QR code")),
      });
    }
  }

  startPolling() {
    this.clearPolling();
    this.pollingTimer = setInterval(() => this.pollIntent(), 1500);
  }

  async pollIntent() {
    if (this.pollInFlight || !this.state.intentId || !this.state.pollToken) {
      return;
    }

    this.pollInFlight = true;
    try {
      const res = await AuthBackend.getWecomProfileConsentIntentStatus(this.state.intentId, this.state.pollToken);
      if (res.status !== "ok") {
        this.clearPolling();
        this.setState({
          status: "failed",
          errorMessage: res.msg || t("login:WeCom authorization failed. Please retry"),
        });
        return;
      }

      const nextStatus = res.data?.status || "pending";
      if (nextStatus === "authorized") {
        this.clearPolling();
        this.setState({status: "authorized", errorMessage: ""});
        await this.completeIntent({});
      } else if (nextStatus === "expired" || nextStatus === "failed") {
        this.clearPolling();
        this.setState({
          status: nextStatus,
          errorMessage: res.data?.errorText || "",
        });
      } else if (nextStatus === "completed") {
        this.clearPolling();
        this.setState({status: "completed", errorMessage: ""});
      } else {
        this.setState({status: "pending", errorMessage: ""});
      }
    } catch (error) {
      this.clearPolling();
      this.setState({
        status: "failed",
        errorMessage: getErrorMessage(error, t("login:WeCom authorization failed. Please retry")),
      });
    } finally {
      this.pollInFlight = false;
    }
  }

  getPreferredMfaProp(mfaProps: MfaProp[] | null | undefined): MfaProp | null {
    if (!Array.isArray(mfaProps) || mfaProps.length === 0) {
      return null;
    }
    return mfaProps.find((mfa: MfaProp) => mfa.isPreferred) || mfaProps[0];
  }

  async completeIntent(values: Record<string, unknown> = {}) {
    if (this.completing) {
      return null;
    }

    this.completing = true;
    this.setState({status: "authorized"});
    try {
      const res = await AuthBackend.completeWecomProfileConsentLoginIntent(this.state.intentId, this.state.pollToken, values);
      if (res.status !== "ok") {
        this.setState({
          status: "failed",
          errorMessage: res.msg || t("login:WeCom authorization failed. Please retry"),
        });
        return res;
      }

      if (res.data === NextMfa) {
        this.setState({
          status: "mfa_pending",
          mfaProps: res.data2 || [],
          selectedMfaProp: this.getPreferredMfaProp(res.data2),
          errorMessage: "",
        });
        return res;
      }

      this.setState({status: "completed", errorMessage: ""});
      this.props.onLoginResponse?.(res);
      return res;
    } catch (error) {
      this.setState({
        status: "failed",
        errorMessage: getErrorMessage(error, t("login:WeCom authorization failed. Please retry")),
      });
      return {status: "error", msg: getErrorMessage(error, "")};
    } finally {
      this.completing = false;
    }
  }

  submitMfa(values: Record<string, unknown>) {
    return AuthBackend.completeWecomProfileConsentLoginIntent(this.state.intentId, this.state.pollToken, values);
  }

  async prepareWidget() {
    // 切到兼容网页登录时废弃仍在飞行中的敏感授权意图创建结果，避免后台继续轮询旧二维码。
    this.intentRequestSeq++;
    this.clearPolling();
    const providerItem = this.getWeComProviderItem();
    const {authUrl, widget, errorMessage} = this.getWidgetParams(providerItem);

    this.setState({
      fallbackMode: true,
      fallbackStatus: widget ? "loading" : "error",
      fallbackErrorMessage: errorMessage || "",
      intentId: "",
      pollToken: "",
      mfaProps: null,
      selectedMfaProp: null,
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
        throw new Error(t("login:Failed to load WeCom QR code widget"));
      }

      mountPoint.innerHTML = "";
      const widgetOptions: WeComLoginWidgetOptions = {
        id: this.mountId,
        appid: widget.appid,
        agentid: widget.agentid,
        redirect_uri: widget.redirectUri,
        state: widget.state,
        self_redirect: false,
      };
      if (widget.scope) {
        // 企业微信敏感资料授权依赖 scope=snsapi_privateinfo，内嵌扫码组件也必须显式携带。
        widgetOptions.scope = widget.scope;
      }
      new widgetFactory(widgetOptions);

      this.setState({
        authUrl: authUrl || this.state.authUrl,
        fallbackStatus: "active",
        fallbackErrorMessage: "",
      });
    } catch (error) {
      this.setState({
        fallbackStatus: "error",
        fallbackErrorMessage: getErrorMessage(error, t("login:Failed to load WeCom QR code widget")),
      });
    }
  }

  renderHint() {
    if (this.state.fallbackMode) {
      if (this.state.fallbackErrorMessage) {
        return (
          <Alert
            type="warning"
            showIcon
            message={this.state.fallbackErrorMessage}
            style={{textAlign: "left", marginBottom: 16}}
          />
        );
      }

      return (
        <div style={{textAlign: "center", color: "rgba(0, 0, 0, 0.65)", marginBottom: 12}}>
          {t("login:Compatible WeCom web login only verifies identity and may not sync phone, email, or avatar")}
        </div>
      );
    }

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
        {this.renderStatusText()}
      </div>
    );
  }

  renderStatusText() {
    if (this.state.status === "authorized") {
      return t("login:Authorization completed. Finishing sign-in");
    }
    if (this.state.status === "mfa_pending") {
      return t("login:Complete MFA to finish WeCom sign-in");
    }
    if (this.state.status === "expired") {
      return t("login:WeCom QR code has expired");
    }
    return t("login:Use WeCom to scan the QR code and consent to sign in");
  }

  renderQRCodeStatus(): WeComQrCodeStatus {
    if (this.state.status === "loading") {
      return "loading";
    }
    if (this.state.status === "expired" || this.state.status === "failed") {
      return "expired";
    }
    if (this.state.status === "authorized" || this.state.status === "completed") {
      return "scanned";
    }
    return "active";
  }

  renderMfaPanel() {
    const selectedMfaProp = this.state.selectedMfaProp;
    if (!selectedMfaProp) {
      return null;
    }

    const loginContext = this.getLoginContext();
    return (
      <div style={{textAlign: "left"}}>
        <MfaAuthVerifyForm
          mfaProps={selectedMfaProp}
          formValues={{type: loginContext.type || "login"}}
          authParams={null}
          application={this.props.application}
          verifyAuth={(values: Record<string, unknown>) => this.submitMfa(values)}
          recoverAuth={(values: Record<string, unknown>) => this.submitMfa(values)}
          onFail={(errorMessage: string) => this.setState({errorMessage})}
          onSuccess={(res: WeComLoginResponse) => {
            this.setState({status: "completed", errorMessage: ""});
            this.props.onLoginResponse?.(res);
          }}
        />
        {Array.isArray(this.state.mfaProps) ? this.state.mfaProps.map(mfa => {
          if (selectedMfaProp.mfaType === mfa.mfaType) {
            return null;
          }
          return (
            <Button
              key={mfa.mfaType}
              type="link"
              onClick={() => this.setState({selectedMfaProp: mfa})}
            >
              {mfa.mfaType}
            </Button>
          );
        }) : null}
      </div>
    );
  }

  renderScanPanel() {
    if (this.state.status === "mfa_pending") {
      return this.renderMfaPanel();
    }

    if (this.state.fallbackMode) {
      return (
        <>
          {this.state.fallbackStatus === "loading" ? <Spin /> : null}
          <div id={this.mountId} style={{display: this.state.fallbackStatus === "active" ? "block" : "none"}} />
        </>
      );
    }

    return (
      <div
        style={{
          display: "inline-flex",
          padding: WeComOAuthQRCodeQuietZone,
          backgroundColor: "#ffffff",
          lineHeight: 0,
        }}
      >
        <QRCode
          style={{margin: "auto"}}
          bordered={false}
          status={this.renderQRCodeStatus()}
          value={this.state.authUrl || " "}
          size={WeComOAuthQRCodeSize}
        />
      </div>
    );
  }

  renderActions() {
    if (this.state.fallbackMode) {
      return (
        <div style={{marginTop: 12, display: "flex", justifyContent: "center", gap: 12}}>
          <Button onClick={() => this.prepareWidget()}>
            {t("login:Refresh")}
          </Button>
          <Button onClick={() => this.prepareConsentIntent()}>
            {t("login:Return to authorization login")}
          </Button>
        </div>
      );
    }

    return (
      <div style={{marginTop: 12, display: "flex", justifyContent: "center", gap: 12}}>
        <Button onClick={() => this.prepareConsentIntent()}>
          {t("login:Refresh")}
        </Button>
        <Button onClick={() => this.prepareWidget()}>
          {t("login:Use compatible web login")}
        </Button>
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
            minHeight: this.state.status === "mfa_pending" ? 350 : WeComOAuthScanPanelMinHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: "#ffffff",
          }}
        >
          {this.renderScanPanel()}
        </div>
        {this.renderActions()}
      </div>
    );
  }
}

export default WeComLoginPanel;
