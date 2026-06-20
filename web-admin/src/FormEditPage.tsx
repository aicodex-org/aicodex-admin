// Copyright 2025 The Casdoor Authors. All Rights Reserved.
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
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import FormItemTable from "./table/FormItemTable";
import UserListPage from "./UserListPage";
import ApplicationListPage from "./ApplicationListPage";
import ProviderListPage from "./ProviderListPage";
import OrganizationListPage from "./OrganizationListPage";

const {Option} = Select;

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;

interface FormEditProps extends AdminRouteProps {
  match: {
    params: {
      formName: string;
    };
    [key: string]: LegacyAny;
  };
  location?: {
    mode?: string;
    [key: string]: LegacyAny;
  };
}

interface FormEditState {
  classes: FormEditProps;
  formName: string;
  form: LegacyAny;
  formItems: LegacyAny[];
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

const UserListPageLegacy = UserListPage as React.ComponentType<LegacyAny>;
const ApplicationListPageLegacy = ApplicationListPage as React.ComponentType<LegacyAny>;
const ProviderListPageLegacy = ProviderListPage as React.ComponentType<LegacyAny>;
const OrganizationListPageLegacy = OrganizationListPage as React.ComponentType<LegacyAny>;

class FormEditPage extends React.Component<FormEditProps, FormEditState> {
  constructor(props: FormEditProps) {
    super(props);
    this.state = {
      classes: props,
      formName: props.match.params.formName,
      form: null,
      formItems: [],
    };
  }

  UNSAFE_componentWillMount() {
    this.getForm();
  }

  getForm() {
    FormBackend.getForm(this.props.account.owner, this.state.formName)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          this.setState({
            form: res.data,
          });
        }
      });
  }

  updateFormField(key: string, value: LegacyAny) {
    const form = this.state.form;
    form[key] = value;
    this.setState({
      form: form,
    });
  }

  renderForm() {
    const form = this.state.form;

    return (
      <Card size="small" title={
        <div>
          {t("form:Edit Form")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitFormEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary"
            onClick={() => this.submitFormEdit(true)}>{t("general:Save & Exit")}</Button>
        </div>
      } style={{marginLeft: "5px"}} type="inner">
        <Row style={{marginTop: "10px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input
              value={form.name}
              disabled={true}
              onChange={e => {this.updateFormField("name", e.target.value);}}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={form.displayName} onChange={e => {
              this.updateFormField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
            {Setting.getLabel(t("general:Type"), t("general:Type - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Select
              style={{width: "100%"}}
              value={form.type}
              onChange={(value: string) => {
                this.updateFormField("type", value);
                this.updateFormField("name", value);
                this.updateFormField("displayName", value);
                const defaultItems = new FormItemTable({formType: value}).getItems();
                this.updateFormField("formItems", defaultItems);
              }}
            >
              {Setting.getFormTypeOptions().map(option => (
                <Option key={option.id} value={option.id}>{t(option.name)}</Option>
              ))}
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
            {Setting.getLabel(t("user:Tag"), t("product:Tag - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={form.tag} onChange={e => {
              this.updateFormField("tag", e.target.value);
              this.updateFormField("name", e.target.value ? `${form.type}-tag-${e.target.value}` : form.type);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("form:Form items"), t("form:Form items - Tooltip"))} :
          </Col>
          <Col span={22}>
            <FormItemTable
              title={t("form:Form items")}
              table={form.formItems}
              onUpdateTable={(value: LegacyAny) => {
                this.updateFormField("formItems", value);
              }}
              formType={form.type}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Preview"), t("general:Preview - Tooltip"))} :
          </Col>
          <Col span={22}>
            {
              this.renderListPreview()
            }
          </Col>
        </Row>
      </Card>
    );
  }

  renderListPreview() {
    const form = this.state.form;
    let listPageComponent: React.ReactElement | null = null;

    if (form.type === "users") {
      listPageComponent = (<UserListPageLegacy {...this.props} formItems={form.formItems} />);
    } else if (form.type === "applications") {
      listPageComponent = (<ApplicationListPageLegacy {...this.props} formItems={form.formItems} />);
    } else if (form.type === "providers") {
      listPageComponent = (<ProviderListPageLegacy {...this.props} formItems={form.formItems} />);
    } else if (form.type === "organizations") {
      listPageComponent = (<OrganizationListPageLegacy {...this.props} formItems={form.formItems} />);
    }

    return (
      <div style={{position: "relative", border: "1px solid rgb(217,217,217)", height: "600px", cursor: "pointer"}} onClick={(e) => {Setting.openLink(`/${form.type}`);}}>
        <div style={{position: "relative", height: "100%", overflow: "auto"}}>
          <div style={{display: "inline-block", position: "relative", zIndex: 1, pointerEvents: "none"}}>
            {listPageComponent}
          </div>
        </div>
        <div style={{position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: "rgba(0,0,0,0.4)", pointerEvents: "none"}} />
      </div>
    );
  }

  submitFormEdit(exitAfterSave: boolean) {
    const form = Setting.deepCopy(this.state.form);
    FormBackend.updateForm(this.state.form.owner, this.state.formName, form)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", t("general:Successfully saved"));
            this.setState({
              formName: this.state.form.name,
            });
            if (exitAfterSave) {
              this.props.history.push("/forms");
            } else {
              this.props.history.push(`/forms/${this.state.form.name}`);
            }
          } else {
            Setting.showMessage("error", t("general:Failed to save"));
            this.updateFormField("name", this.state.formName);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to save")}: ${error}`);
      });
  }

  render() {
    return (
      <div>
        {
          this.state.form !== null ? this.renderForm() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitFormEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large"
            onClick={() => this.submitFormEdit(true)}>{t("general:Save & Exit")}</Button>
        </div>
      </div>
    );
  }
}

export default FormEditPage;
