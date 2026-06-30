// Copyright 2026 The AICodex Authors. All Rights Reserved.
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
import {Alert, Button, Modal, QRCode, Space, Spin} from "antd";
import i18next from "i18next";
import * as AuthBackend from "../auth/AuthBackend";

type WeComSyncStatus = "idle" | "loading" | "pending" | "completed" | "expired" | "failed";

interface WeComProviderRecord {
  owner?: string;
  name?: string;
  type?: string;
  subType?: string;
  method?: string;
  clientId?: string;
  clientSecret?: string;
  appId?: string;
}

interface ApplicationProviderItem {
  provider?: WeComProviderRecord | null;
}

interface WeComProfileSyncApplication {
  name?: string;
  providers?: ApplicationProviderItem[];
}

interface WeComProfileSyncPanelProps {
  application?: WeComProfileSyncApplication | null;
  disabled?: boolean;
  style?: React.CSSProperties;
  onSynced?: () => void;
}

interface WeComProfileSyncPanelState {
  modalOpen: boolean;
  status: WeComSyncStatus;
  authUrl: string;
  expiresAt: string;
  intentId: string;
  pollToken: string;
  errorMessage: string;
}

interface WeComSyncIntentResponse {
  status?: string;
  msg?: string;
  data?: {
    intentId?: string;
    authUrl?: string;
    expiresAt?: string;
    pollToken?: string;
  };
}

interface WeComSyncPollResponse {
  status?: string;
  msg?: string;
  data?: {
    status?: WeComSyncStatus;
    expiresAt?: string;
    errorText?: string;
  };
}

const t = (key: string): string => String(i18next.t(key));
const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : t("account:WeCom profile sync failed. Please retry");

class WeComProfileSyncPanel extends React.Component<WeComProfileSyncPanelProps, WeComProfileSyncPanelState> {
  private pollingTimer: ReturnType<typeof setInterval> | null;
  private pollInFlight: boolean;
  private synced: boolean;

  constructor(props: WeComProfileSyncPanelProps) {
    super(props);
    this.state = {
      modalOpen: false,
      status: "idle",
      authUrl: "",
      expiresAt: "",
      intentId: "",
      pollToken: "",
      errorMessage: "",
    };
    this.pollingTimer = null;
    this.pollInFlight = false;
    this.synced = false;
  }

  componentWillUnmount() {
    this.clearPolling();
  }

  getWeComProviderItem(): ApplicationProviderItem | null {
    const providers = this.props.application?.providers || [];
    return providers.find((item) => {
      const provider = item?.provider;
      return provider?.type === "WeCom" && provider.subType === "Internal" && provider.method === "Normal";
    }) || null;
  }

  getProviderId(providerItem: ApplicationProviderItem | null): string {
    if (!providerItem?.provider) {
      return "";
    }
    return `${providerItem.provider.owner}/${providerItem.provider.name}`;
  }

  getProviderError(providerItem: ApplicationProviderItem | null): string {
    if (!providerItem?.provider) {
      return t("account:WeCom profile sync is not configured for the current application");
    }
    const provider = providerItem.provider;
    if (!provider.clientId || !provider.clientSecret || !provider.appId) {
      return t("account:WeCom profile sync configuration is incomplete");
    }
    return "";
  }

  clearPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  openSyncModal(): void {
    this.setState({
      modalOpen: true,
      status: "loading",
      authUrl: "",
      expiresAt: "",
      intentId: "",
      pollToken: "",
      errorMessage: "",
    }, () => this.prepareSyncIntent());
  }

  closeSyncModal(): void {
    this.clearPolling();
    this.setState({modalOpen: false});
  }

  async prepareSyncIntent(): Promise<void> {
    this.clearPolling();
    this.synced = false;
    const providerItem = this.getWeComProviderItem();
    const providerError = this.getProviderError(providerItem);
    if (providerError) {
      this.setState({status: "failed", errorMessage: providerError});
      return;
    }

    try {
      const res = await AuthBackend.createWecomProfileConsentProfileSyncIntent({
        application: this.props.application?.name || "",
        provider: this.getProviderId(providerItem),
      }) as WeComSyncIntentResponse;
      if (res.status !== "ok" || !res.data?.intentId || !res.data?.authUrl || !res.data?.pollToken) {
        this.setState({
          status: "failed",
          errorMessage: res.msg || t("account:WeCom profile sync failed. Please retry"),
        });
        return;
      }

      this.setState({
        status: "pending",
        authUrl: res.data.authUrl,
        expiresAt: res.data.expiresAt || "",
        intentId: res.data.intentId,
        pollToken: res.data.pollToken,
        errorMessage: "",
      }, () => this.startPolling());
    } catch (error) {
      this.setState({
        status: "failed",
        errorMessage: getErrorMessage(error),
      });
    }
  }

  startPolling(): void {
    this.clearPolling();
    this.pollingTimer = setInterval(() => this.pollIntent(), 1500);
  }

  async pollIntent(): Promise<void> {
    if (this.pollInFlight || !this.state.intentId || !this.state.pollToken) {
      return;
    }

    this.pollInFlight = true;
    try {
      const res = await AuthBackend.getWecomProfileConsentIntentStatus(this.state.intentId, this.state.pollToken) as WeComSyncPollResponse;
      if (res.status !== "ok") {
        this.clearPolling();
        this.setState({
          status: "failed",
          errorMessage: res.msg || t("account:WeCom profile sync failed. Please retry"),
        });
        return;
      }

      const nextStatus = res.data?.status || "pending";
      if (nextStatus === "completed") {
        this.clearPolling();
        this.setState({status: "completed", errorMessage: ""});
        if (!this.synced) {
          this.synced = true;
          this.props.onSynced?.();
        }
      } else if (nextStatus === "expired" || nextStatus === "failed") {
        this.clearPolling();
        this.setState({
          status: nextStatus,
          errorMessage: res.data?.errorText || "",
        });
      } else {
        this.setState({status: "pending", errorMessage: ""});
      }
    } catch (error) {
      this.clearPolling();
      this.setState({
        status: "failed",
        errorMessage: getErrorMessage(error),
      });
    } finally {
      this.pollInFlight = false;
    }
  }

  renderQRCodeStatus(): "active" | "expired" | "loading" | "scanned" {
    if (this.state.status === "loading") {
      return "loading";
    }
    if (this.state.status === "expired" || this.state.status === "failed") {
      return "expired";
    }
    if (this.state.status === "completed") {
      return "scanned";
    }
    return "active";
  }

  renderStatus(): React.ReactNode {
    if (this.state.status === "loading") {
      return <Spin />;
    }
    if (this.state.status === "completed") {
      return (
        <Alert
          type="success"
          showIcon
          message={t("account:WeCom profile synced")}
          style={{marginBottom: 16}}
        />
      );
    }
    if (this.state.status === "expired") {
      return (
        <Alert
          type="warning"
          showIcon
          message={t("account:WeCom profile sync QR code expired")}
          style={{marginBottom: 16}}
        />
      );
    }
    if (this.state.errorMessage) {
      return (
        <Alert
          type="warning"
          showIcon
          message={this.state.errorMessage}
          style={{marginBottom: 16}}
        />
      );
    }
    return (
      <div style={{marginBottom: 12, color: "rgba(0, 0, 0, 0.65)"}}>
        {t("account:Use WeCom to scan the QR code and consent to sync profile")}
      </div>
    );
  }

  renderModal(): React.ReactNode {
    return (
      <Modal
        title={t("account:Sync WeCom profile")}
        open={this.state.modalOpen}
        onCancel={() => this.closeSyncModal()}
        footer={(
          <Space>
            <Button onClick={() => this.closeSyncModal()}>{t("account:Close")}</Button>
            <Button onClick={() => this.prepareSyncIntent()}>{t("login:Refresh")}</Button>
          </Space>
        )}
      >
        <div style={{textAlign: "center"}}>
          {this.renderStatus()}
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
            <QRCode
              bordered={false}
              status={this.renderQRCodeStatus()}
              value={this.state.authUrl || " "}
              size={230}
            />
          </div>
        </div>
      </Modal>
    );
  }

  render() {
    const providerError = this.getProviderError(this.getWeComProviderItem());
    return (
      <React.Fragment>
        <Button
          style={this.props.style}
          disabled={this.props.disabled || !!providerError}
          onClick={() => this.openSyncModal()}
        >
          {t("account:Sync WeCom profile")}
        </Button>
        {this.renderModal()}
      </React.Fragment>
    );
  }
}

export default WeComProfileSyncPanel;
