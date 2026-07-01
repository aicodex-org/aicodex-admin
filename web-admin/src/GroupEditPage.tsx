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
import {Button, Card, Col, Input, Row, Select, Switch} from "antd";
import type {SelectProps} from "antd";
import * as GroupBackend from "./backend/GroupBackend";
import type {GroupMutation, GroupRecord} from "./backend/GroupBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

type HistoryLike = {
  push: (location: string | {pathname: string; mode?: string}) => void;
};

type GroupEditRouteParams = {
  organizationName: string;
  groupName: string;
};

type GroupEditPageProps = {
  account?: unknown;
  history: HistoryLike;
  location: {
    mode?: string;
    [key: string]: unknown;
  };
  match: {
    params: GroupEditRouteParams;
  };
  organizationName?: string;
};

type OrganizationSummary = {
  name: string;
  displayName?: string;
  [key: string]: unknown;
};

type GroupOption = NonNullable<SelectProps["options"]>[number];

type GroupEditPageState = {
  classes: GroupEditPageProps;
  groupName: string;
  organizationName: string;
  group: GroupRecord | null;
  users: string[];
  groups: GroupRecord[];
  organizations: OrganizationSummary[];
  mode: string;
};

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

class GroupEditPage extends React.Component<GroupEditPageProps, GroupEditPageState> {
  constructor(props: GroupEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      groupName: props.match.params.groupName,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      group: null,
      users: [],
      groups: [],
      organizations: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount() {
    this.getGroup();
    this.getGroups(this.state.organizationName);
    this.getOrganizations();
  }

  getGroup() {
    GroupBackend.getGroup(this.state.organizationName, this.state.groupName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            group: res.data ?? null,
          });
        }
      });
  }

  getGroups(organizationName: string) {
    GroupBackend.getGroups(organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            groups: (res.data ?? []) as GroupRecord[],
          });
        }
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizationNames("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            organizations: (res.data || []) as unknown as OrganizationSummary[],
          });
        }
      });
  }

  parseGroupField(key: keyof GroupRecord, value: unknown): unknown {
    if ([""].includes(String(key))) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateGroupField(key: keyof GroupRecord, value: unknown) {
    value = this.parseGroupField(key, value);

    const group = this.state.group!;
    group[key] = value as never;
    this.setState({
      group: group,
    });
  }

  getParentIdOptions(): GroupOption[] {
    const currentGroup = this.state.group;
    if (currentGroup === null) {
      return [];
    }

    const groups: Array<Pick<GroupRecord, "name" | "displayName">> = this.state.groups.filter((group) => group.name !== currentGroup.name);
    const organization = this.state.organizations.find((organization) => organization.name === currentGroup.owner);
    if (organization !== undefined) {
      groups.push({name: organization.name, displayName: organization.displayName});
    }
    return groups.map((group) => ({label: group.displayName, value: group.name}));
  }

  renderGroup() {
    const group = this.state.group;
    if (group === null) {
      return null;
    }

    return (
      <Card className="admin-identity-object-edit-card group-edit-card" size="small" title={
        <div>
          {this.state.mode === "add" ? t("group:New Group") : t("group:Edit Group")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitGroupEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitGroupEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteGroup()}>{t("general:Cancel")}</Button> : null}
        </div>
      }
      style={(Setting.isMobile()) ? {margin: "5px"} : {}}
      type="inner"
      >
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={group.owner}
              onChange={(value => {
                this.updateGroupField("owner", value);
                this.getGroups(value);
              })}
              options={this.state.organizations.map((organization) => Setting.getOption(organization.displayName, organization.name))
              } />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={group.name} onChange={e => {
              this.updateGroupField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={group.displayName} onChange={e => {
              this.updateGroupField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Type"), t("general:Type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select style={{width: "100%"}}
              options={
                [
                  {label: t("group:Virtual"), value: "Virtual"},
                  {label: t("group:Physical"), value: "Physical"},
                ].map((item) => ({label: item.label, value: item.value}))
              }
              value={group.type} onChange={(value => {
                this.updateGroupField("type", value);
              }
              )} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("group:Parent group"), t("group:Parent group - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select style={{width: "100%"}}
              options={this.getParentIdOptions()}
              value={group.parentId} onChange={(value => {
                this.updateGroupField("parentId", value);
              }
              )} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Users"), t("general:Users - Tooltip"))} :
          </Col>
          <Col style={{marginTop: "5px"}} span={22} >
            {
              (Setting.getTags as (...args: unknown[]) => React.ReactNode)(group.users, "users")
            }
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(t("general:Is enabled"), t("general:Is enabled - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={group.isEnabled} onChange={checked => {
              this.updateGroupField("isEnabled", checked);
            }} />
          </Col>
        </Row>
      </Card>
    );
  }

  submitGroupEdit(exitAfterSave: boolean) {
    const group = Setting.deepCopy(this.state.group) as GroupMutation;
    group["isTopGroup"] = this.state.organizations.some((organization) => organization.name === group.parentId);

    GroupBackend.updateGroup(this.state.organizationName, this.state.groupName, group)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            groupName: this.state.group!.name,
          });

          if (exitAfterSave) {
            const groupTreeUrl = sessionStorage.getItem("groupTreeUrl");
            if (groupTreeUrl !== null) {
              sessionStorage.removeItem("groupTreeUrl");
              this.props.history.push(groupTreeUrl);
            } else {
              this.props.history.push("/groups");
            }
          } else {
            this.props.history.push(`/groups/${this.state.group!.owner}/${this.state.group!.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateGroupField("name", this.state.groupName);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteGroup() {
    GroupBackend.deleteGroup(this.state.group!)
      .then((res) => {
        if (res.status === "ok") {
          const groupTreeUrl = sessionStorage.getItem("groupTreeUrl");
          if (groupTreeUrl !== null) {
            sessionStorage.removeItem("groupTreeUrl");
            this.props.history.push(groupTreeUrl);
          } else {
            this.props.history.push("/groups");
          }
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
      <div className="admin-identity-object-edit-page group-edit-page">
        {
          this.state.group !== null ? this.renderGroup() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitGroupEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitGroupEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteGroup()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default GroupEditPage;
