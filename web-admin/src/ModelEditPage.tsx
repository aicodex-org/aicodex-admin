// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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
import * as ModelBackend from "./backend/ModelBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import ModelEditor from "./CasbinEditor";

const {Option} = Select;

type Account = {
  owner: string;
  tag: string;
  isAdmin?: boolean;
};

type ModelRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  displayName: string;
  description?: string;
  modelText: string;
  [key: string]: unknown;
};

type OrganizationRecord = {
  name: string;
};

type HistoryLike = {
  push: (location: string) => void;
};

type ModelEditPageProps = {
  account: Account;
  history: HistoryLike;
  location: {
    mode?: "add" | "edit";
  };
  match: {
    params: {
      organizationName: string;
      modelName: string;
    };
  };
  organizationName?: string;
};

type ModelEditPageState = {
  classes: ModelEditPageProps;
  organizationName: string;
  modelName: string;
  model: ModelRecord | null;
  organizations: OrganizationRecord[];
  users: unknown[];
  mode: "add" | "edit";
};

type ModelResponse = {
  status: string;
  msg?: string;
  data: ModelRecord | null;
};

type OrganizationsResponse = {
  status: string;
  data?: OrganizationRecord[];
};

type MutationResponse = {
  status: string;
  msg?: string;
};

const t = (key: string): string => i18next.t(key) as string;

class ModelEditPage extends React.Component<ModelEditPageProps, ModelEditPageState> {
  constructor(props: ModelEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      modelName: props.match.params.modelName,
      model: null,
      organizations: [],
      users: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getModel();
    this.getOrganizations();
  }

  getModel(): void {
    ModelBackend.getModel(this.state.organizationName, this.state.modelName)
      .then((res: ModelResponse) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          model: res.data,
        });
      });
  }

  getOrganizations(): void {
    OrganizationBackend.getOrganizations("admin")
      .then((res: OrganizationsResponse) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  parseModelField(key: string, value: unknown): unknown {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateModelField(key: string, value: unknown): void {
    value = this.parseModelField(key, value);

    const model = this.state.model;
    if (model === null) {
      return;
    }
    model[key] = value;
    this.setState({
      model: model,
    });
  }

  renderModel(): React.ReactElement | null {
    const model = this.state.model;
    if (model === null) {
      return null;
    }

    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("model:New Model") : t("model:Edit Model")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitModelEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitModelEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteModel()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account) || Setting.builtInObject(model)} value={model.owner} onChange={(value => {this.updateModelField("owner", value);})}>
              {
                this.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={Setting.builtInObject(model)} value={model.name} onChange={e => {
              this.updateModelField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={model.displayName} onChange={e => {
              this.updateModelField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Description"), t("general:Description - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={model.description} onChange={e => {
              this.updateModelField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("model:Model text"), t("model:Model text - Tooltip"))} :
          </Col>
          <Col span={22}>
            <div style={{position: "relative", height: "500px"}} >
              <ModelEditor
                model={model}
                onModelTextChange={(value) => this.updateModelField("modelText", value)}
              />
            </div>
          </Col>
        </Row>
      </Card>
    );
  }

  submitModelEdit(exitAfterSave: boolean): void {
    if (this.state.model === null) {
      return;
    }
    const model = Setting.deepCopy(this.state.model);
    ModelBackend.updateModel(this.state.organizationName, this.state.modelName, model)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          const savedModel = this.state.model;
          if (savedModel === null) {
            return;
          }
          this.setState({
            modelName: savedModel.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/models");
          } else {
            this.props.history.push(`/models/${savedModel.owner}/${savedModel.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateModelField("name", this.state.modelName);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteModel(): void {
    if (this.state.model === null) {
      return;
    }
    ModelBackend.deleteModel(this.state.model)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push("/models");
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
      <div>
        {
          this.state.model !== null ? this.renderModel() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitModelEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitModelEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteModel()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default ModelEditPage;
