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

import React from "react";
import {Button, Card, Col, Input, Row, Select} from "antd";
import * as AdapterBackend from "./backend/AdapterBackend";
import * as EnforcerBackend from "./backend/EnforcerBackend";
import * as ModelBackend from "./backend/ModelBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import PolicyTable from "./table/PolicyTable";
import * as Setting from "./Setting";
import i18next from "i18next";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";

type Account = {
  owner: string;
  tag?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type HistoryLike = {
  push: (location: string) => void;
};

type EnforcerEditPageProps = {
  account: Account;
  history: HistoryLike;
  location: {
    mode?: string;
  };
  match: {
    params: {
      organizationName: string;
      enforcerName: string;
    };
  };
  organizationName?: string;
};

type EnforcerRecord = {
  owner: string;
  name: string;
  displayName?: string;
  description?: string;
  model: string;
  adapter: string;
  modelCfg?: Record<string, string>;
  [key: string]: unknown;
};

type OrganizationRecord = {
  name: string;
};

type NameRecord = {
  owner: string;
  name: string;
};

type BackendResponse<T = unknown> = {
  status: string;
  msg?: string;
  data?: T;
};

type BackendDataResponse<T> = BackendResponse<T> & {
  data: T;
};

type EnforcerEditPageState = {
  classes: EnforcerEditPageProps;
  organizationName: string;
  enforcerName: string;
  enforcer: EnforcerRecord | null;
  organizations: OrganizationRecord[];
  models: NameRecord[];
  adapters: NameRecord[];
  mode: string;
};

type EnforcerBackendApi = {
  getEnforcer: (owner: string, name: string, loadModelCfg: boolean) => Promise<BackendDataResponse<EnforcerRecord | null>>;
  updateEnforcer: (owner: string, name: string, enforcer: EnforcerRecord) => Promise<BackendResponse>;
  deleteEnforcer: (enforcer: EnforcerRecord | null) => Promise<BackendResponse>;
};

type OrganizationBackendApi = {
  getOrganizations: (owner: string) => Promise<BackendResponse<OrganizationRecord[]>>;
};

type ModelBackendApi = {
  getModels: (owner: string) => Promise<BackendResponse<NameRecord[]>>;
};

type AdapterBackendApi = {
  getAdapters: (owner: string) => Promise<BackendResponse<NameRecord[]>>;
};

const enforcerBackend = EnforcerBackend as unknown as EnforcerBackendApi;
const organizationBackend = OrganizationBackend as unknown as OrganizationBackendApi;
const modelBackend = ModelBackend as unknown as ModelBackendApi;
const adapterBackend = AdapterBackend as unknown as AdapterBackendApi;
const t = (key: string): string => i18next.t(key) as string;

class EnforcerEditPage extends React.Component<EnforcerEditPageProps, EnforcerEditPageState> {
  constructor(props: EnforcerEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      enforcerName: props.match.params.enforcerName,
      enforcer: null,
      organizations: [],
      models: [],
      adapters: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getEnforcer();
    this.getOrganizations();
  }

  getEnforcer(): void {
    enforcerBackend.getEnforcer(this.state.organizationName, this.state.enforcerName, true)
      .then((res: BackendDataResponse<EnforcerRecord | null>) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        const enforcer = res.data;
        this.setState({
          enforcer: enforcer,
        }, () => this.publishWorkspaceTabLabel(enforcer));

        this.getModels(this.state.organizationName);
        this.getAdapters(this.state.organizationName);
      });
  }

  getOrganizations(): void {
    organizationBackend.getOrganizations("admin")
      .then((res: BackendResponse<OrganizationRecord[]>) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  getModels(organizationName: string): void {
    modelBackend.getModels(organizationName)
      .then((res: BackendResponse<NameRecord[]>) => {
        this.setState({
          models: res.data || [],
        });
      });
  }

  getAdapters(organizationName: string): void {
    adapterBackend.getAdapters(organizationName)
      .then((res: BackendResponse<NameRecord[]>) => {
        this.setState({
          adapters: res.data || [],
        });
      });
  }

  parseEnforcerField(key: string, value: unknown): unknown {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateEnforcerField(key: string, value: unknown): void {
    value = this.parseEnforcerField(key, value);

    const enforcer = this.state.enforcer;
    if (enforcer === null) {
      return;
    }
    enforcer[key] = value;
    this.setState({
      enforcer: enforcer,
    }, () => {
      if (key === "displayName") {
        this.publishWorkspaceTabLabel(enforcer);
      }
    });
  }

  getCurrentWorkspaceTabPath(): string {
    return `/enforcers/${this.state.organizationName}/${this.state.enforcerName}`;
  }

  getEnforcerWorkspaceTabLabel(enforcer: EnforcerRecord): string {
    const displayName = `${enforcer.displayName || ""}`.trim() || `${enforcer.name || this.state.enforcerName}`.trim();
    const editLabel = t("enforcer:Edit Enforcer");
    const separator = /[\u3400-\u9fff]/.test(editLabel) ? "：" : ": ";

    return `${editLabel}${separator}${displayName}`;
  }

  // 对象加载或顶层显示名称变化后，只更新当前编辑路由对应的工作页标签。
  publishWorkspaceTabLabel(enforcer: EnforcerRecord): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getEnforcerWorkspaceTabLabel(enforcer),
      },
    }));
  }

  renderEnforcer(): React.ReactElement | null {
    if (this.state.enforcer === null) {
      return null;
    }
    const enforcer = this.state.enforcer;
    return (
      <Card className="admin-access-edit-card" size="small" title={
        <div>
          {this.state.mode === "add" ? t("enforcer:New Enforcer") : t("enforcer:Edit Enforcer")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitEnforcerEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitEnforcerEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteEnforcer()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row className="admin-access-edit-field-row" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account) || Setting.builtInObject(enforcer)} value={enforcer.owner} onChange={(owner: string) => {
              this.updateEnforcerField("owner", owner);
              this.getModels(owner);
              this.getAdapters(owner);
            }}
            options={this.state.organizations.map((organization) => Setting.getOption(organization.name, organization.name))
            } />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={Setting.builtInObject(enforcer)} value={enforcer.name} onChange={e => {
              this.updateEnforcerField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={enforcer.displayName} onChange={e => {
              this.updateEnforcerField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Description"), t("general:Description - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={enforcer.description} onChange={e => {
              this.updateEnforcerField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Model"), t("general:Model - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} disabled={Setting.builtInObject(enforcer)} style={{width: "100%"}} value={enforcer.model} onChange={(model: string) => {
              this.updateEnforcerField("model", model);
            }}
            options={this.state.models.map((model) => Setting.getOption(`${model.owner}/${model.name}`, `${model.owner}/${model.name}`))
            } />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Adapter"), t("general:Adapter - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} disabled={Setting.builtInObject(enforcer)} style={{width: "100%"}} value={enforcer.adapter} onChange={(adapter: string) => {
              this.updateEnforcerField("adapter", adapter);
            }}
            options={this.state.adapters.map((adapter) => Setting.getOption(`${adapter.owner}/${adapter.name}`, `${adapter.owner}/${adapter.name}`))
            } />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("adapter:Policies"), t("adapter:Policies - Tooltip"))} :
          </Col>
          <Col span={22}>
            <PolicyTable enforcer={enforcer} modelCfg={enforcer.modelCfg} mode={this.state.mode} />
          </Col>
        </Row>
      </Card>
    );
  }

  submitEnforcerEdit(exitAfterSave: boolean): void {
    const enforcer = Setting.deepCopy(this.state.enforcer) as EnforcerRecord;
    enforcerBackend.updateEnforcer(this.state.organizationName, this.state.enforcerName, enforcer)
      .then((res: BackendResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            enforcerName: this.state.enforcer?.name || this.state.enforcerName,
          });

          if (exitAfterSave) {
            this.props.history.push("/enforcers");
          } else {
            this.props.history.push(`/enforcers/${this.state.enforcer?.owner}/${this.state.enforcer?.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateEnforcerField("name", this.state.enforcerName);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteEnforcer(): void {
    enforcerBackend.deleteEnforcer(this.state.enforcer)
      .then((res: BackendResponse) => {
        if (res.status === "ok") {
          this.props.history.push("/enforcers");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render(): React.ReactElement {
    return (
      <div className="admin-access-edit-page enforcer-edit-page">
        {
          this.state.enforcer !== null ? this.renderEnforcer() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitEnforcerEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitEnforcerEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteEnforcer()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default EnforcerEditPage;
