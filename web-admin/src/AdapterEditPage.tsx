// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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
import {Button, Card, Col, Input, InputNumber, Row, Select, Switch} from "antd";
import * as AdapterBackend from "./backend/AdapterBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

const {Option} = Select;

type Account = {
  owner: string;
  tag: string;
  isAdmin?: boolean;
};

type AdapterRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  table: string;
  useSameDb: boolean;
  type: string;
  databaseType: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  [key: string]: unknown;
};

type OrganizationRecord = {
  name: string;
};

type HistoryLike = {
  push: (location: string) => void;
};

type AdapterEditPageProps = {
  account: Account;
  history: HistoryLike;
  location: {
    mode?: "add" | "edit";
  };
  match: {
    params: {
      organizationName: string;
      adapterName: string;
    };
  };
  organizationName?: string;
};

type AdapterEditPageState = {
  classes: AdapterEditPageProps;
  organizationName: string;
  adapterName: string;
  adapter: AdapterRecord | null;
  organizations: OrganizationRecord[];
  mode: "add" | "edit";
};

type AdapterResponse = {
  status: string;
  msg?: string;
  data?: AdapterRecord | null;
};

type OrganizationsResponse = {
  status: string;
  data?: OrganizationRecord[];
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type AdapterBackendApi = {
  getAdapter: (owner: string, name: string) => Promise<AdapterResponse>;
  updateAdapter: (owner: string, name: string, adapter: AdapterRecord) => Promise<MutationResponse>;
  deleteAdapter: (adapter: AdapterRecord) => Promise<MutationResponse>;
  getPolicies: (owner: string, name: string, adapterId?: string) => Promise<MutationResponse>;
};

type OrganizationBackendApi = {
  getOrganizations: (owner: string) => Promise<OrganizationsResponse>;
};

const adapterBackend = AdapterBackend as unknown as AdapterBackendApi;
const organizationBackend = OrganizationBackend as unknown as OrganizationBackendApi;
const t = (key: string): string => i18next.t(key) as string;

class AdapterEditPage extends React.Component<AdapterEditPageProps, AdapterEditPageState> {
  constructor(props: AdapterEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      adapterName: props.match.params.adapterName,
      adapter: null,
      organizations: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getAdapter();
    this.getOrganizations();
  }

  getAdapter(): void {
    adapterBackend.getAdapter(this.state.organizationName, this.state.adapterName)
      .then((res: AdapterResponse) => {
        if (res.status === "ok") {
          if (res.data === null) {
            this.props.history.push("/404");
            return;
          }

          this.setState({
            adapter: res.data || null,
          });
        }
      });
  }

  getOrganizations(): void {
    organizationBackend.getOrganizations("admin")
      .then((res: OrganizationsResponse) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  parseAdapterField(_key: keyof AdapterRecord, value: unknown): unknown {
    // if ([].includes(key)) {
    //   value = Setting.myParseInt(value);
    // }
    return value;
  }

  updateAdapterField(key: keyof AdapterRecord, value: unknown): void {
    value = this.parseAdapterField(key, value);

    const adapter = this.state.adapter;
    if (adapter === null) {
      return;
    }
    adapter[key] = value;
    this.setState({
      adapter: adapter,
    });
  }

  renderAdapter(): React.ReactElement | null {
    const adapter = this.state.adapter;
    if (adapter === null) {
      return null;
    }

    return (
      <Card className="admin-access-edit-card" size="small" title={
        <div>
          {this.state.mode === "add" ? t("adapter:New Adapter") : t("adapter:Edit Adapter")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitAdapterEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitAdapterEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteAdapter()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row className="admin-access-edit-field-row" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account) || Setting.builtInObject(adapter)} value={adapter.owner} onChange={(value => {
              this.updateAdapterField("owner", value);
            })}>
              {
                this.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={Setting.builtInObject(adapter)} value={adapter.name} onChange={e => {
              this.updateAdapterField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("syncer:Table"), t("syncer:Table - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={adapter.table}
              disabled={Setting.builtInObject(adapter)} onChange={e => {
                this.updateAdapterField("table", e.target.value);
              }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(t("adapter:Use same DB"), t("adapter:Use same DB - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch disabled={Setting.builtInObject(adapter)} checked={adapter.useSameDb || Setting.builtInObject(adapter)} onChange={(checked: boolean) => {
              this.updateAdapterField("useSameDb", checked);
              if (checked) {
                this.updateAdapterField("type", "");
                this.updateAdapterField("databaseType", "");
                this.updateAdapterField("host", "");
                this.updateAdapterField("port", 0);
                this.updateAdapterField("user", "");
                this.updateAdapterField("password", "");
                this.updateAdapterField("database", "");
              } else {
                this.updateAdapterField("type", "Database");
                this.updateAdapterField("databaseType", "mysql");
                this.updateAdapterField("host", "localhost");
                this.updateAdapterField("port", 3306);
                this.updateAdapterField("user", "root");
                this.updateAdapterField("password", "123456");
                this.updateAdapterField("database", "dbName");
              }
            }} />
          </Col>
        </Row>
        {
          (adapter.useSameDb || Setting.builtInObject(adapter)) ? null : (
            <React.Fragment>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("general:Type"), t("general:Type - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Select virtual={false} disabled={Setting.builtInObject(adapter)} style={{width: "100%"}} value={adapter.type} onChange={(value => {
                    this.updateAdapterField("type", value);
                    const adapter = this.state.adapter;
                    // adapter["tableColumns"] = Setting.getAdapterTableColumns(this.state.adapter);
                    this.setState({
                      adapter: adapter,
                    });
                  })}>
                    {
                      ["Database"]
                        .map((item, index) => <Option key={index} value={item}>{item}</Option>)
                    }
                  </Select>
                </Col>
              </Row>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("syncer:Database type"), t("syncer:Database type - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Select virtual={false} disabled={Setting.builtInObject(adapter)} style={{width: "100%"}} value={adapter.databaseType} onChange={(value => {this.updateAdapterField("databaseType", value);})}>
                    {
                      [
                        {id: "mysql", name: "MySQL"},
                        {id: "postgres", name: "PostgreSQL"},
                        {id: "mssql", name: "SQL Server"},
                        {id: "oracle", name: "Oracle"},
                        {id: "sqlite3", name: "Sqlite 3"},
                      ].map((databaseType, index) => <Option key={index} value={databaseType.id}>{databaseType.name}</Option>)
                    }
                  </Select>
                </Col>
              </Row>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("provider:Host"), t("provider:Host - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Input value={adapter.host} onChange={e => {
                    this.updateAdapterField("host", e.target.value);
                  }} />
                </Col>
              </Row>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("provider:Port"), t("provider:Port - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <InputNumber value={adapter.port} min={0} max={65535} onChange={value => {
                    this.updateAdapterField("port", value);
                  }} />
                </Col>
              </Row>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("general:User"), t("general:User - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Input value={adapter.user} onChange={e => {
                    this.updateAdapterField("user", e.target.value);
                  }} />
                </Col>
              </Row>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("general:Password"), t("general:Password - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Input value={adapter.password} onChange={e => {
                    this.updateAdapterField("password", e.target.value);
                  }} />
                </Col>
              </Row>
              <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("syncer:Database"), t("syncer:Database - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Input disabled={Setting.builtInObject(adapter)} value={adapter.database} onChange={e => {
                    this.updateAdapterField("database", e.target.value);
                  }} />
                </Col>
              </Row>
            </React.Fragment>
          )
        }
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("provider:DB test"), t("provider:DB test - Tooltip"))} :
          </Col>
          <Col span={2} >
            <Button disabled={this.state.organizationName !== adapter.owner} type={"primary"} onClick={() => {
              adapterBackend.getPolicies("", "", `${adapter.owner}/${adapter.name}`)
                .then((res: MutationResponse) => {
                  if (res.status === "ok") {
                    Setting.showMessage("success", t("syncer:Connect successfully"));
                  } else {
                    Setting.showMessage("error", t("syncer:Failed to connect") + ": " + res.msg);
                  }
                })
                .catch((error: unknown) => {
                  Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
                });
            }
            }>{t("syncer:Test DB Connection")}</Button>
          </Col>
        </Row>
      </Card>
    );
  }

  submitAdapterEdit(exitAfterSave: boolean): void {
    if (this.state.adapter === null) {
      return;
    }
    const adapter = Setting.deepCopy(this.state.adapter) as AdapterRecord;
    adapterBackend.updateAdapter(this.state.organizationName, this.state.adapterName, adapter)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          const savedAdapter = this.state.adapter;
          if (savedAdapter === null) {
            return;
          }
          this.setState({
            organizationName: savedAdapter.owner,
            adapterName: savedAdapter.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/adapters");
          } else {
            this.props.history.push(`/adapters/${savedAdapter.owner}/${savedAdapter.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateAdapterField("name", this.state.adapterName);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteAdapter(): void {
    if (this.state.adapter === null) {
      return;
    }
    adapterBackend.deleteAdapter(this.state.adapter)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push("/adapters");
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
      <div className="admin-access-edit-page adapter-edit-page">
        {
          this.state.adapter !== null ? this.renderAdapter() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitAdapterEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitAdapterEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteAdapter()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default AdapterEditPage;
