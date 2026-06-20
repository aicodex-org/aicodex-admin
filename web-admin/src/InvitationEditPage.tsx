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
import {Button, Card, Col, Input, InputNumber, Modal, Row, Select, Table} from "antd";
import {CopyOutlined} from "@ant-design/icons";
import * as InvitationBackend from "./backend/InvitationBackend";
import type {InvitationMutation, InvitationRecord} from "./backend/InvitationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import type {OrganizationRecord} from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import i18next from "i18next";
import copy from "copy-to-clipboard";
import * as GroupBackend from "./backend/GroupBackend";
import type {GroupRecord} from "./backend/GroupBackend";

const {Option} = Select;

type HistoryLike = {
  push: (location: string | {pathname: string; mode?: string}) => void;
};

type InvitationEditRouteParams = {
  organizationName: string;
  invitationName: string;
};

type InvitationEditPageProps = {
  account?: unknown;
  history: HistoryLike;
  location: {
    mode?: string;
    [key: string]: unknown;
  };
  match: {
    params: InvitationEditRouteParams;
  };
  organizationName?: string;
};

type ApplicationRecord = {
  name: string;
  [key: string]: unknown;
};

type InvitationEmailRow = {
  email: string;
};

type InvitationEditPageState = {
  classes: InvitationEditPageProps;
  organizationName: string;
  invitationName: string;
  invitation: InvitationRecord | null;
  organizations: OrganizationRecord[];
  applications: ApplicationRecord[];
  groups: GroupRecord[];
  mode: string;
  emails?: string;
  showSendModal?: boolean;
  sendLoading: boolean;
};

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

class InvitationEditPage extends React.Component<InvitationEditPageProps, InvitationEditPageState> {
  constructor(props: InvitationEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      invitationName: props.match.params.invitationName,
      invitation: null,
      organizations: [],
      applications: [],
      groups: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
      sendLoading: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getInvitation();
    this.getOrganizations();
    this.getApplicationsByOrganization(this.state.organizationName);
    this.getGroupsByOrganization(this.state.organizationName);
  }

  getInvitation() {
    InvitationBackend.getInvitation(this.state.organizationName, this.state.invitationName)
      .then((res) => {
        if (res.data === null || res.data === undefined) {
          this.props.history.push("/404");
          return;
        }

        this.setState({
          invitation: res.data,
        });
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizations("admin")
      .then((res) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  getApplicationsByOrganization(organizationName: string) {
    ApplicationBackend.getApplicationsByOrganization("admin", organizationName)
      .then((res: {data?: ApplicationRecord[]}) => {
        this.setState({
          applications: res.data || [],
        });
      });
  }

  getGroupsByOrganization(organizationName: string) {
    GroupBackend.getGroups(organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            groups: (res.data || []) as GroupRecord[],
          });
        }
      });
  }

  parseInvitationField(key: keyof InvitationRecord, value: unknown): unknown {
    if ([""].includes(String(key))) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateInvitationField(key: keyof InvitationRecord, value: unknown) {
    value = this.parseInvitationField(key, value);

    const invitation = this.state.invitation!;
    invitation[key] = value as never;
    this.setState({
      invitation: invitation,
    });
  }

  copySignupLink() {
    const invitation = this.state.invitation!;
    let defaultApplication;
    if (invitation.owner === "built-in") {
      defaultApplication = Conf.DefaultApplication;
    } else {
      const selectedOrganization = Setting.getArrayItem(this.state.organizations, "name", invitation.owner) as OrganizationRecord;
      defaultApplication = selectedOrganization.defaultApplication;
      if (!defaultApplication) {
        Setting.showMessage("error", t("invitation:You need to first specify a default application for organization: ") + selectedOrganization.name);
        return;
      }
    }
    copy(`${window.location.origin}/signup/${defaultApplication}?invitationCode=${invitation.defaultCode}`);
    Setting.showMessage("success", t("general:Copied to clipboard successfully"));
  }

  renderSendEmailModal() {
    const emailColumns = [
      {title: "email", dataIndex: "email"},
    ];
    const emails = this.state.emails?.split("\n")?.filter(email => Setting.isValidEmail(email));
    const emailData = emails?.map((email) => {return {email: email};});

    return <Modal title={t("general:Send")}
      style={{height: "800px"}}
      open={this.state.showSendModal}
      closable
      footer={[
        <Button key={1} loading={this.state.sendLoading} type="primary"
          onClick={() => {
            this.setState({sendLoading: true});
            InvitationBackend.sendInvitation(this.state.invitation!, emails as string[]).then((res) => {
              this.setState({sendLoading: false});
              if (res.status === "error") {
                Setting.showMessage("error", res.msg);
                return;
              }
              Setting.showMessage("success", t("general:Successfully sent"));
            }).catch(err => Setting.showMessage("error", err.message));
          }}>{t("general:Send")}</Button>,
      ]}
      onCancel={() => {this.setState({showSendModal: false});}}>
      <div >
        <p>You will send invitation email to:</p>
        <Table showHeader={false} columns={emailColumns} dataSource={emailData} size={"small"}></Table>
      </div>
    </Modal>;
  }

  renderInvitation() {
    const invitation = this.state.invitation;
    if (invitation === null) {
      return null;
    }

    const isCreatedByPlan = invitation.tag === "auto_created_invitation_for_plan";
    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("invitation:New Invitation") : t("invitation:Edit Invitation")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitInvitationEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitInvitationEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteInvitation()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account) || isCreatedByPlan} value={invitation.owner} onChange={(value => {const organizationName = value as string; this.updateInvitationField("owner", organizationName); this.getApplicationsByOrganization(organizationName);this.getGroupsByOrganization(organizationName);})}>
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
            <Input value={invitation.name} disabled={isCreatedByPlan} onChange={e => {
              this.updateInvitationField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={invitation.displayName} onChange={e => {
              this.updateInvitationField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("invitation:Code"), t("invitation:Code - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={invitation.code} onChange={e => {
              const regex = /[^a-zA-Z0-9]/;
              if (!regex.test(e.target.value)) {
                this.updateInvitationField("defaultCode", e.target.value);
              }
              this.updateInvitationField("code", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("invitation:Default code"), t("invitation:Default code - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={invitation.defaultCode} onChange={e => {
              this.updateInvitationField("defaultCode", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          </Col>
          <Col span={22} >
            <Button style={{marginBottom: "10px"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={_ => this.copySignupLink()}>
              {t("application:Copy signup page URL")}
            </Button>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Send")}
          </Col>
          <Col span={22} >
            <Input.TextArea autoSize={{minRows: 3, maxRows: 10}} value={this.state.emails} onChange={(value) => {
              this.setState({emails: value.target.value});
            }}></Input.TextArea>
            <Button type="primary" style={{marginTop: "20px"}} onClick={() => this.setState({showSendModal: true})}>{t("general:Send")}</Button>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("invitation:Quota"), t("invitation:Quota - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber min={0} value={invitation.quota} onChange={value => {
              this.updateInvitationField("quota", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("invitation:Used count"), t("invitation:Used count - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber min={0} max={invitation.quota} value={invitation.usedCount} onChange={value => {
              this.updateInvitationField("usedCount", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Application"), t("general:Application - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={invitation.application}
              onChange={(value => {this.updateInvitationField("application", value);})}
              options={[
                {label: t("general:All"), value: "All"},
                ...this.state.applications.map((application) => Setting.getOption(application.name, application.name)),
              ]} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("provider:Signup group"), t("provider:Signup group - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={invitation.signupGroup} onChange={(value => {this.updateInvitationField("signupGroup", value);})}>
              <Option key={""} value={""}>
                {t("general:Default")}
              </Option>
              {
                this.state.groups.map((group, index) => <Option key={index} value={`${group.owner}/${group.name}`}>{group.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("signup:Username"), t("signup:Username - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={invitation.username} onChange={e => {
              this.updateInvitationField("username", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Email"), t("general:Email - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={invitation.email} onChange={e => {
              this.updateInvitationField("email", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Phone"), t("general:Phone - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={invitation.phone} onChange={e => {
              this.updateInvitationField("phone", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:State"), t("general:State - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={invitation.state} onChange={(value => {
              this.updateInvitationField("state", value);
            })}
            options={[
              {value: "Active", name: t("subscription:Active")},
              {value: "Suspended", name: t("subscription:Suspended")},
            ].map((item) => Setting.getOption(item.name, item.value))}
            />
          </Col>
        </Row>
      </Card>
    );
  }

  submitInvitationEdit(exitAfterSave: boolean) {
    const invitation = Setting.deepCopy(this.state.invitation) as InvitationMutation;
    InvitationBackend.updateInvitation(this.state.organizationName, this.state.invitationName, invitation)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            invitationName: this.state.invitation!.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/invitations");
          } else {
            this.props.history.push(`/invitations/${this.state.invitation!.owner}/${this.state.invitation!.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateInvitationField("name", this.state.invitationName);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteInvitation() {
    InvitationBackend.deleteInvitation(this.state.invitation!)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push("/invitations");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div>
        {this.state.showSendModal ? this.renderSendEmailModal() : null}
        {
          this.state.invitation !== null ? this.renderInvitation() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitInvitationEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitInvitationEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteInvitation()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default InvitationEditPage;
