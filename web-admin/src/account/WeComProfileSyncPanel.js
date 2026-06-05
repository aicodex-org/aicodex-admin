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

class WeComProfileSyncPanel extends React.Component {
  constructor(props) {
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

  getWeComProviderItem() {
    const providers = this.props.application?.providers || [];
    return providers.find(item => {
      const provider = item?.provider;
      return provider?.type === "WeCom" && provider.subType === "Internal" && provider.method === "Normal";
    }) || null;
  }

  getProviderId(providerItem) {
    if (!providerItem?.provider) {
      return "";
    }
    return `${providerItem.provider.owner}/${providerItem.provider.name}`;
  }

  getProviderError(providerItem) {
    if (!providerItem?.provider) {
      return i18next.t("account:WeCom profile sync is not configured for the current application");
    }
    const provider = providerItem.provider;
    if (!provider.clientId || !provider.clientSecret || !provider.appId) {
      return i18next.t("account:WeCom profile sync configuration is incomplete");
    }
    return "";
  }

  clearPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  openSyncModal() {
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

  closeSyncModal() {
    this.clearPolling();
    this.setState({modalOpen: false});
  }

  async prepareSyncIntent() {
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
      });
      if (res.status !== "ok" || !res.data?.intentId || !res.data?.authUrl || !res.data?.pollToken) {
        this.setState({
          status: "failed",
          errorMessage: res.msg || i18next.t("account:WeCom profile sync failed. Please retry"),
        });
        return;
      }

      this.setState({
        status: "pending",
        authUrl: res.data.authUrl,
        expiresAt: res.data.expiresAt,
        intentId: res.data.intentId,
        pollToken: res.data.pollToken,
        errorMessage: "",
      }, () => this.startPolling());
    } catch (error) {
      this.setState({
        status: "failed",
        errorMessage: error?.message || i18next.t("account:WeCom profile sync failed. Please retry"),
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
          errorMessage: res.msg || i18next.t("account:WeCom profile sync failed. Please retry"),
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
        errorMessage: error?.message || i18next.t("account:WeCom profile sync failed. Please retry"),
      });
    } finally {
      this.pollInFlight = false;
    }
  }

  renderQRCodeStatus() {
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

  renderStatus() {
    if (this.state.status === "loading") {
      return <Spin />;
    }
    if (this.state.status === "completed") {
      return (
        <Alert
          type="success"
          showIcon
          message={i18next.t("account:WeCom profile synced")}
          style={{marginBottom: 16}}
        />
      );
    }
    if (this.state.status === "expired") {
      return (
        <Alert
          type="warning"
          showIcon
          message={i18next.t("account:WeCom profile sync QR code expired")}
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
        {i18next.t("account:Use WeCom to scan the QR code and consent to sync profile")}
      </div>
    );
  }

  renderModal() {
    return (
      <Modal
        title={i18next.t("account:Sync WeCom profile")}
        open={this.state.modalOpen}
        onCancel={() => this.closeSyncModal()}
        footer={(
          <Space>
            <Button onClick={() => this.closeSyncModal()}>{i18next.t("account:Close")}</Button>
            <Button onClick={() => this.prepareSyncIntent()}>{i18next.t("login:Refresh")}</Button>
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
          {i18next.t("account:Sync WeCom profile")}
        </Button>
        {this.renderModal()}
      </React.Fragment>
    );
  }
}

export default WeComProfileSyncPanel;
