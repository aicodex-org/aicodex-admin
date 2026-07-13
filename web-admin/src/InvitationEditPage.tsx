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
import {Button, Card, Input, InputNumber, Modal, Select, Table} from "antd";
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
import LargeEditShell, {LargeEditFieldRow, LargeEditSection} from "./common/LargeEditShell";

const {Option} = Select;

type HistoryLike = {
  push: (location: string | {pathname: string; state?: {mode: string; invitation: InvitationRecord}}) => void;
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
    state?: {
      mode?: string;
      invitation?: InvitationRecord;
    };
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
  fieldErrors: Partial<Record<"name" | "email", string>>;
};

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

class InvitationEditPage extends React.Component<InvitationEditPageProps, InvitationEditPageState> {
  constructor(props: InvitationEditPageProps) {
    super(props);
    const mode = props.location.state?.mode ?? props.location.mode ?? "edit";
    const draftInvitation = mode === "add" ? props.location.state?.invitation : undefined;
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      invitationName: props.match.params.invitationName,
      invitation: draftInvitation ? {...draftInvitation} : null,
      organizations: [],
      applications: [],
      groups: [],
      mode: mode,
      sendLoading: false,
      fieldErrors: {},
    };
  }

  UNSAFE_componentWillMount() {
    if (this.state.mode === "add") {
      if (this.state.invitation === null) {
        this.returnToInvitationList();
        return;
      }
    } else {
      this.getInvitation();
    }
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

    const invitation = {...this.state.invitation!};
    invitation[key] = value as never;
    const fieldErrors = {...this.state.fieldErrors};
    if (key === "name" || key === "email") {
      delete fieldErrors[key];
    }
    this.setState({
      invitation: invitation,
      fieldErrors,
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

  returnToInvitationList(): void {
    this.props.history.push("/invitations");
  }

  handleCancel(): void {
    this.returnToInvitationList();
  }

  renderFieldRow(label: React.ReactNode, control: React.ReactNode, options: {required?: boolean; error?: string; wide?: boolean} = {}): React.ReactNode {
    return (
      <LargeEditFieldRow classPrefix="invitation-edit" label={label} required={options.required} error={options.error} wide={options.wide}>
        {control}
      </LargeEditFieldRow>
    );
  }

  validateInvitationBeforeSave(): boolean {
    const invitation = this.state.invitation;
    if (invitation === null) {
      return false;
    }

    const fieldErrors: InvitationEditPageState["fieldErrors"] = {};
    const name = invitation.name.trim();
    if (name === "") {
      fieldErrors.name = t("provider:This field is required");
    // 邀请码名称是路由和持久化使用的技术 ID，只允许稳定的 ASCII 标识符字符。
    } else if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      fieldErrors.name = t("invitation:Invalid invitation name characters");
    }

    const email = (invitation.email ?? "").trim();
    if (email !== "" && !Setting.isValidEmail(email)) {
      fieldErrors.email = t("login:The input is not valid Email!");
    }

    this.setState({fieldErrors});
    return Object.keys(fieldErrors).length === 0;
  }

  renderSection(title: string, children: React.ReactNode): React.ReactNode {
    return (
      <LargeEditSection classPrefix="invitation-edit" title={title}>
        {children}
      </LargeEditSection>
    );
  }

  renderInvitation() {
    const invitation = this.state.invitation;
    if (invitation === null) {
      return null;
    }

    const isCreatedByPlan = invitation.tag === "auto_created_invitation_for_plan";
    const title = this.state.mode === "add" ? t("invitation:New Invitation") : `${t("invitation:Edit Invitation")} (${invitation.displayName || invitation.name})`;

    return (
      <Card
        className="identity-object-edit-card admin-identity-object-edit-card invitation-edit-card"
        size="small"
        variant="borderless"
        style={Setting.isMobile() ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="invitation-edit"
          backLabel={t("general:Back")}
          breadcrumb={<>{t("general:Organization & Accounts")} / {t("general:Invitations")} /</>}
          title={title}
          onBack={() => this.handleCancel()}
          actions={(
            <>
              <Button onClick={() => this.handleCancel()}>{t("general:Cancel")}</Button>
              <Button type="primary" onClick={() => this.submitInvitationEdit(false)}>{t("general:Save")}</Button>
              <Button onClick={() => this.submitInvitationEdit(true)}>{t("invitation:Save and return")}</Button>
            </>
          )}
        >
          {this.renderSection(t("invitation:Basic information"), (
            <>
              {this.renderFieldRow(
                Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip")),
                <Select virtual={false} disabled={!Setting.isAdminUser(this.props.account) || isCreatedByPlan} value={invitation.owner} onChange={(value: string) => {
                  this.updateInvitationField("owner", value);
                  this.getApplicationsByOrganization(value);
                  this.getGroupsByOrganization(value);
                }} options={this.state.organizations.map((organization) => Setting.getOption(organization.displayName || organization.name, organization.name))} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Name"), t("general:Name - Tooltip")),
                <Input status={this.state.fieldErrors.name ? "error" : undefined} value={invitation.name} disabled={isCreatedByPlan} onChange={e => this.updateInvitationField("name", e.target.value)} />,
                {required: true, error: this.state.fieldErrors.name}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip")),
                <Input value={invitation.displayName} onChange={e => this.updateInvitationField("displayName", e.target.value)} />
              )}
            </>
          ))}

          {this.renderSection(t("invitation:Invitation configuration"), (
            <>
              {this.renderFieldRow(
                Setting.getLabel(t("invitation:Code"), t("invitation:Code - Tooltip")),
                <Input value={invitation.code} onChange={e => {
                  const regex = /[^a-zA-Z0-9]/;
                  if (!regex.test(e.target.value)) {
                    this.updateInvitationField("defaultCode", e.target.value);
                  }
                  this.updateInvitationField("code", e.target.value);
                }} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("invitation:Default code"), t("invitation:Default code - Tooltip")),
                <div className="invitation-edit-default-code-control">
                  <Input value={invitation.defaultCode} onChange={e => this.updateInvitationField("defaultCode", e.target.value)} />
                  <Button icon={<CopyOutlined />} onClick={() => this.copySignupLink()}>{t("application:Copy signup page URL")}</Button>
                </div>,
                {wide: true}
              )}
              {this.renderFieldRow(
                t("general:Send"),
                <div className="invitation-edit-send-control">
                  <Input.TextArea autoSize={{minRows: 3, maxRows: 10}} value={this.state.emails} onChange={event => this.setState({emails: event.target.value})} />
                  <Button size="small" type="primary" onClick={() => this.setState({showSendModal: true})}>{t("general:Send")}</Button>
                </div>,
                {wide: true}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("invitation:Quota"), t("invitation:Quota - Tooltip")),
                <InputNumber min={0} value={invitation.quota} onChange={value => this.updateInvitationField("quota", value)} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("invitation:Used count"), t("invitation:Used count - Tooltip")),
                <InputNumber min={0} max={invitation.quota} value={invitation.usedCount} onChange={value => this.updateInvitationField("usedCount", value)} />
              )}
            </>
          ))}

          {this.renderSection(t("invitation:Registration target"), (
            <>
              {this.renderFieldRow(
                Setting.getLabel(t("general:Application"), t("general:Application - Tooltip")),
                <Select virtual={false} value={invitation.application} onChange={(value: string) => this.updateInvitationField("application", value)} options={[
                  {label: t("general:All"), value: "All"},
                  ...this.state.applications.map((application) => Setting.getOption(application.name, application.name)),
                ]} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("provider:Signup group"), t("provider:Signup group - Tooltip")),
                <Select virtual={false} value={invitation.signupGroup} onChange={(value: string) => this.updateInvitationField("signupGroup", value)}>
                  <Option key="" value="">{t("general:Default")}</Option>
                  {this.state.groups.map((group) => <Option key={`${group.owner}/${group.name}`} value={`${group.owner}/${group.name}`}>{group.name}</Option>)}
                </Select>
              )}
            </>
          ))}

          {this.renderSection(t("invitation:Registration information"), (
            <>
              {this.renderFieldRow(
                Setting.getLabel(t("signup:Username"), t("signup:Username - Tooltip")),
                <Input value={invitation.username} onChange={e => this.updateInvitationField("username", e.target.value)} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Email"), t("general:Email - Tooltip")),
                <Input status={this.state.fieldErrors.email ? "error" : undefined} value={invitation.email} onChange={e => this.updateInvitationField("email", e.target.value)} />,
                {error: this.state.fieldErrors.email}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Phone"), t("general:Phone - Tooltip")),
                <Input value={invitation.phone} onChange={e => this.updateInvitationField("phone", e.target.value)} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:State"), t("general:State - Tooltip")),
                <Select virtual={false} value={invitation.state} onChange={(value: string) => this.updateInvitationField("state", value)} options={[
                  {value: "Active", name: t("subscription:Active")},
                  {value: "Suspended", name: t("subscription:Suspended")},
                ].map((item) => Setting.getOption(item.name, item.value))} />
              )}
            </>
          ))}
        </LargeEditShell>
      </Card>
    );
  }

  submitInvitationEdit(exitAfterSave: boolean) {
    if (!this.validateInvitationBeforeSave()) {
      return;
    }

    const invitation = Setting.deepCopy(this.state.invitation) as InvitationMutation;
    const saveInvitation = this.state.mode === "add"
      ? InvitationBackend.addInvitation(invitation)
      : InvitationBackend.updateInvitation(this.state.organizationName, this.state.invitationName, invitation);
    saveInvitation
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            organizationName: this.state.invitation!.owner,
            invitationName: this.state.invitation!.name,
            // 新建成功后后续保存应走更新接口，避免再次创建同一邀请码。
            mode: "edit",
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

  render() {
    return (
      <div className="identity-object-edit-page admin-identity-object-edit-page invitation-edit-page">
        {this.state.showSendModal ? this.renderSendEmailModal() : null}
        {
          this.state.invitation !== null ? this.renderInvitation() : null
        }
      </div>
    );
  }
}

export default InvitationEditPage;
