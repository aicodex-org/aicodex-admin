// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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

import {CopyOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import React from "react";
import {Button, Card, Col, Input, InputNumber, Row, Select, Switch} from "antd";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as PricingBackend from "./backend/PricingBackend";
import * as PlanBackend from "./backend/PlanBackend";
import PricingPage from "./pricing/PricingPage";
import * as Setting from "./Setting";
import rawI18next from "i18next";
import type {AdminRouteProps} from "./types/legacyPage";
import type {PaymentApplicationRecord, PaymentOrganizationRecord, PlanRecord, PricingRecord} from "./types/businessPayment";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";
type LegacyAny = import("./types/legacyPage").LegacyAny;
const i18next = rawI18next as unknown as {t: (key: string) => string};

interface PricingEditProps extends AdminRouteProps {
  organizationName?: string;
}

interface PricingEditState {
  classes: PricingEditProps;
  organizationName: string;
  pricingName: string;
  organizations: PaymentOrganizationRecord[];
  applications: PaymentApplicationRecord[];
  pricing: PricingRecord | null;
  plans: PlanRecord[];
  mode: string;
}

class PricingEditPage extends React.Component<PricingEditProps, PricingEditState> {
  constructor(props: PricingEditProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      pricingName: props.match.params.pricingName,
      organizations: [],
      applications: [],
      pricing: null,
      plans: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount() {
    this.getPricing();
    this.getOrganizations();
    this.getApplicationsByOrganization(this.state.organizationName);
  }

  getPricing() {
    PricingBackend.getPricing(this.state.organizationName, this.state.pricingName)
      .then((res: LegacyAny) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          pricing: res.data,
        }, () => this.publishWorkspaceTabLabel(res.data));
        this.getPlans(this.state.organizationName);
      });
  }

  getPlans(organizationName: string) {
    PlanBackend.getPlans(organizationName)
      .then((res: LegacyAny) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          plans: res.data,
        });
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizations("admin")
      .then((res: LegacyAny) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  getApplicationsByOrganization(organizationName: string) {
    ApplicationBackend.getApplicationsByOrganization("admin", organizationName)
      .then((res: LegacyAny) => {
        this.setState({
          applications: res.data || [],
        });
      });
  }

  parsePricingField(key: string, value: LegacyAny) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updatePricingField(key: keyof PricingRecord | string, value: LegacyAny) {
    value = this.parsePricingField(String(key), value);

    const pricing = this.state.pricing;
    if (pricing === null) {
      return;
    }
    pricing[key] = value;

    this.setState({
      pricing: pricing,
    }, () => {
      if (key === "displayName") {
        this.publishWorkspaceTabLabel(pricing);
      }
    });
  }

  getCurrentWorkspaceTabPath(): string {
    return `/pricings/${this.state.organizationName}/${this.state.pricingName}`;
  }

  getPricingWorkspaceTabLabel(pricing: PricingRecord): string {
    const displayName = typeof pricing.displayName === "string" ? pricing.displayName.trim() : "";
    const objectName = displayName || `${pricing.name || this.state.pricingName}`.trim();
    const editLabel = i18next.t("pricing:Edit Pricing");
    const separator = /[\u3400-\u9fff]/.test(editLabel) ? "：" : ": ";

    return `${editLabel}${separator}${objectName}`;
  }

  // 定价详情加载或顶层显示名称变化后，只更新当前工作页标签。
  publishWorkspaceTabLabel(pricing: PricingRecord): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getPricingWorkspaceTabLabel(pricing),
      },
    }));
  }

  renderPricing() {
    if (this.state.pricing === null) {
      return null;
    }
    const isViewMode = this.state.mode === "view";
    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? i18next.t("pricing:New Pricing") : (isViewMode ? i18next.t("pricing:View Pricing") : i18next.t("pricing:Edit Pricing"))}&nbsp;&nbsp;&nbsp;&nbsp;
          {!isViewMode && (<>
            <Button onClick={() => this.submitPricingEdit(false)}>{i18next.t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitPricingEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deletePricing()}>{i18next.t("general:Cancel")}</Button> : null}
          </>)}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Organization"), i18next.t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.pricing.owner} disabled={isViewMode} onChange={(owner => {
              this.updatePricingField("owner", owner);
              this.getApplicationsByOrganization(owner);
              this.getPlans(owner);
            })}
            options={this.state.organizations.map((organization) => Setting.getOption(organization.name, organization.name))
            } />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.pricing.name} disabled={isViewMode} onChange={e => {
              this.updatePricingField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.pricing.displayName} disabled={isViewMode} onChange={e => {
              this.updatePricingField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Description"), i18next.t("general:Description - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.pricing.description} disabled={isViewMode} onChange={e => {
              this.updatePricingField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Application"), i18next.t("general:Application - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.pricing.application}
              disabled={isViewMode}
              onChange={(value => {this.updatePricingField("application", value);})}
              options={this.state.applications.map((application) => Setting.getOption(application.name, application.name))
              } />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Plans"), i18next.t("general:Plans - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="multiple" style={{width: "100%"}} value={this.state.pricing.plans}
              disabled={isViewMode}
              onChange={(value => {
                this.updatePricingField("plans", value);
              })}
              options={this.state.plans.map((plan) => Setting.getOption(plan.name, plan.name))}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("pricing:Trial duration"), i18next.t("pricing:Trial duration - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber min={0} value={this.state.pricing.trialDuration} disabled={isViewMode} onChange={value => {
              this.updatePricingField("trialDuration", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("general:Is enabled"), i18next.t("general:Is enabled - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={this.state.pricing.isEnabled} disabled={isViewMode} onChange={checked => {
              this.updatePricingField("isEnabled", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Preview"), i18next.t("general:Preview - Tooltip"))} :
          </Col>
          {
            this.renderPreview()
          }
        </Row>
      </Card>
    );
  }

  submitPricingEdit(exitAfterSave: boolean) {
    if (this.state.pricing === null) {
      return;
    }
    const pricing = Setting.deepCopy(this.state.pricing);
    PricingBackend.updatePricing(this.state.organizationName, this.state.pricingName, pricing)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.setState({
            pricingName: pricing.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/pricings");
          } else {
            this.props.history.push(`/pricings/${pricing.owner}/${pricing.name}`);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
          this.updatePricingField("name", this.state.pricingName);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deletePricing() {
    if (this.state.pricing === null) {
      return;
    }
    PricingBackend.deletePricing(this.state.pricing)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          this.props.history.push("/pricings");
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div>
        {
          this.state.pricing !== null ? this.renderPricing() : null
        }
        {this.state.mode !== "view" && (
          <div style={{marginTop: "20px", marginLeft: "40px"}}>
            <Button size="large" onClick={() => this.submitPricingEdit(false)}>{i18next.t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitPricingEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deletePricing()}>{i18next.t("general:Cancel")}</Button> : null}
          </div>
        )}
      </div>
    );
  }

  renderPreview() {
    if (this.state.pricing === null) {
      return null;
    }
    const pricingUrl = `/select-plan/${this.state.pricing.owner}/${this.state.pricing.name}`;
    return (
      <React.Fragment>
        <Col>
          <Button style={{marginBottom: "10px", marginTop: Setting.isMobile() ? "15px" : "0"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
            copy(`${window.location.origin}${pricingUrl}`);
            Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
          }}
          >
            {i18next.t("pricing:Copy pricing page URL")}
          </Button>
        </Col>
        <Col>
          <PricingPage pricing={this.state.pricing} owner={this.state.pricing.owner}></PricingPage>
        </Col>
      </React.Fragment>
    );
  }
}

export default PricingEditPage;
