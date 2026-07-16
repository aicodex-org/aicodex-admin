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
import {Button, Card, Col, Empty, Input, InputNumber, Radio, Row, Select, Switch} from "antd";
import {LinkOutlined} from "@ant-design/icons";
import * as SyncerBackend from "./backend/SyncerBackend";
import type {SyncerRecord} from "./backend/SyncerBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import SyncerTableColumnTable from "./table/SyncerTableColumnTable";
import type {SyncerTableColumnRecord} from "./table/SyncerTableColumnTable";

import * as CertBackend from "./backend/CertBackend";
import Editor from "./common/Editor";
import LargeEditShell, {LargeEditTabs} from "./common/LargeEditShell";
import EnterpriseTlsPolicyFields from "./common/EnterpriseTlsPolicyFields";
import {
  applyEnterpriseTlsPolicy,
  getEnterpriseTlsPolicyErrorKey,
  isEnterpriseTlsSyncer,
  prepareEnterpriseTlsRecord,
  projectSslCertOptions,
  validateEnterpriseTlsPolicy
} from "./common/enterpriseTlsPolicy";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ExplicitEnterpriseTlsPolicy} from "./common/enterpriseTlsPolicy";

const {Option} = Select;

// 同步器配置来自多种历史后端字段；本页只收窄可直接编辑的值类型，额外字段继续透传。
type LegacySyncerValue = string | number | boolean | SyncerTableColumnRecord[] | unknown[] | null | undefined;

function tr(key: string): string {
  return i18next.t(key) as string;
}

interface AccountRecord {
  owner?: string;
  name?: string;
  [key: string]: unknown;
}

interface RouteMatch {
  params: {
    syncerName: string;
  };
}

interface RouteLocation {
  mode?: "add" | "edit" | string;
  syncer?: SyncerRecord;
}

interface RouteHistory {
  push: (path: string | {pathname: string; mode?: string}) => void;
}

interface SyncerEditProps {
  account: AccountRecord;
  match: RouteMatch;
  location: RouteLocation;
  history: RouteHistory;
}

interface NamedRecord {
  name: string;
  displayName?: string;
  type?: string;
}

type SyncerEditTabKey = "basic" | "connection" | "mapping-status";

const syncerEditTabKeys: SyncerEditTabKey[] = ["basic", "connection", "mapping-status"];

interface BackendResponse<T> {
  status?: string;
  msg?: string;
  data?: T;
}

interface SyncerEditRecord extends Omit<SyncerRecord, "tableColumns"> {
  owner: string;
  name: string;
  organization: string;
  type: string;
  databaseType?: string;
  sslMode?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  table?: string;
  tableColumns: SyncerTableColumnRecord[];
  affiliationTable?: string;
  avatarBaseUrl?: string;
  syncInterval?: number;
  isReadOnly?: boolean;
  isEnabled?: boolean;
  sshType?: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  sshPassword?: string;
  cert?: string;
  errorText?: string;
  [key: string]: unknown;
}

interface SyncerEditState {
  certs: NamedRecord[];
  classes: SyncerEditProps;
  syncerName: string;
  syncer: SyncerEditRecord;
  organizations: NamedRecord[];
  mode: string;
  testDbLoading: boolean;
  submitting: boolean;
  activeTabKey: SyncerEditTabKey;
}

class SyncerEditPage extends React.Component<SyncerEditProps, SyncerEditState> {
  private syncerSaveInFlight = false;

  constructor(props: SyncerEditProps) {
    super(props);
    this.state = {
      certs: [],
      classes: props,
      syncerName: props.match.params.syncerName,
      syncer: null as unknown as SyncerEditRecord,
      organizations: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
      testDbLoading: false,
      submitting: false,
      activeTabKey: this.getInitialTabKey(),
    };
  }

  UNSAFE_componentWillMount() {
    this.getSyncer();
    this.getOrganizations();
  }

  getSyncer() {
    if (this.state.mode === "add" && this.props.location.syncer !== undefined) {
      const draft = this.props.location.syncer as SyncerEditRecord;
      const syncer = prepareEnterpriseTlsRecord(draft, isEnterpriseTlsSyncer(draft), true) as SyncerEditRecord;
      this.setState({syncer});
      if (syncer.organization) {
        this.getCerts(syncer.organization);
      }
      return;
    }

    SyncerBackend.getSyncer("admin", this.state.syncerName)
      .then((res) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        const loaded = res.data as SyncerEditRecord;
        const syncer = prepareEnterpriseTlsRecord(loaded, isEnterpriseTlsSyncer(loaded), false) as SyncerEditRecord;
        this.setState({syncer});

        if (res.data && res.data.organization) {
          this.getCerts(res.data.organization);
        }
      });
  }

  getCerts(owner: string) {
    // Load certificates for the given organization
    CertBackend.getCerts(owner)
      .then((res: BackendResponse<NamedRecord[]>) => {
        this.setState({
          certs: res.data || [],
        });
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizations("admin")
      .then((res: BackendResponse<NamedRecord[]>) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  parseSyncerField(key: string, value: LegacySyncerValue) {
    if (["port"].includes(key)) {
      value = Setting.myParseInt(value as string | number);
    }
    return value;
  }

  updateSyncerField(key: string, value: LegacySyncerValue) {
    value = this.parseSyncerField(key, value);

    let syncer = {...this.state.syncer};
    if (key === "organization" && syncer["organization"] !== value) {
      // the syncer changed the organization, reset the cert and reload certs
      syncer["cert"] = "";
      this.getCerts(value as string);
    }

    syncer[key] = value;
    if (this.state.mode === "add") {
      const isTarget = isEnterpriseTlsSyncer(syncer);
      syncer = prepareEnterpriseTlsRecord(syncer, isTarget, true) as SyncerEditRecord;
      if (!isTarget && key === "type") {
        delete syncer.tlsPolicy;
        syncer.cert = "";
      }
    }
    this.setState({
      syncer: syncer,
    });
  }

  updateSyncerType(value: string): void {
    let syncer: SyncerEditRecord = {...this.state.syncer, type: value};
    syncer.tableColumns = this.getSyncerTableColumns(syncer);
    syncer.table = value === "Keycloak" ? "user_entity" : syncer.table;
    if (this.state.mode === "add") {
      const isTarget = isEnterpriseTlsSyncer(syncer);
      syncer = prepareEnterpriseTlsRecord(syncer, isTarget, true) as SyncerEditRecord;
      if (!isTarget) {
        delete syncer.tlsPolicy;
        syncer.cert = "";
      }
    }
    this.setState({syncer});
  }

  updateSyncerTlsPolicy(policy: ExplicitEnterpriseTlsPolicy): void {
    const syncer = applyEnterpriseTlsPolicy(this.state.syncer, policy) as SyncerEditRecord;
    this.setState({syncer});
  }

  getSyncerTableColumns(syncer: SyncerEditRecord): SyncerTableColumnRecord[] {
    switch (syncer.type) {
    case "Keycloak":
      return [
        {
          "name": "ID",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "USERNAME",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "LAST_NAME+FIRST_NAME",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "EMAIL",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "EMAIL_VERIFIED",
          "type": "boolean",
          "casdoorName": "EmailVerified",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "FIRST_NAME",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "LAST_NAME",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "CREATED_TIMESTAMP",
          "type": "string",
          "casdoorName": "CreatedTime",
          "isHashed": true,
          "values": [

          ],
        },
        {
          "name": "ENABLED",
          "type": "boolean",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [

          ],
        },
      ];
    case "WeCom":
      return [
        {
          "name": "userid",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "email",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mobile",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "avatar",
          "type": "string",
          "casdoorName": "Avatar",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "position",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "gender",
          "type": "string",
          "casdoorName": "Gender",
          "isHashed": true,
          "values": [],
        },
      ];
    case "Azure AD":
      return [
        {
          "name": "id",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "userPrincipalName",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "displayName",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "givenName",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "surname",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mail",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mobilePhone",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "jobTitle",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "officeLocation",
          "type": "string",
          "casdoorName": "Location",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "preferredLanguage",
          "type": "string",
          "casdoorName": "Language",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "accountEnabled",
          "type": "boolean",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [],
        },
      ];
    case "Google Workspace":
      return [
        {
          "name": "id",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "primaryEmail",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name.fullName",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name.givenName",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name.familyName",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "suspended",
          "type": "boolean",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "isAdmin",
          "type": "boolean",
          "casdoorName": "IsAdmin",
          "isHashed": true,
          "values": [],
        },
      ];
    case "DingTalk":
      return [
        {
          "name": "userid",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "unionid",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "email",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mobile",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "avatar",
          "type": "string",
          "casdoorName": "Avatar",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "title",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "active",
          "type": "boolean",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [],
        },
      ];
    case "Active Directory":
      return [
        {
          "name": "objectGUID",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "sAMAccountName",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "displayName",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "givenName",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "sn",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mail",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mobile",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "title",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "department",
          "type": "string",
          "casdoorName": "Affiliation",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "userAccountControl",
          "type": "string",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [],
        },
      ];
    case "Lark":
      return [
        {
          "name": "user_id",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "email",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "mobile",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "avatar",
          "type": "string",
          "casdoorName": "Avatar",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "job_title",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "gender",
          "type": "number",
          "casdoorName": "Gender",
          "isHashed": true,
          "values": [],
        },
      ];
    case "Okta":
      return [
        {
          "name": "id",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.login",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.displayName",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.firstName",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.lastName",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.email",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.mobilePhone",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.title",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "profile.preferredLanguage",
          "type": "string",
          "casdoorName": "Language",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "status",
          "type": "string",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [],
        },
      ];
    case "SCIM":
      return [
        {
          "name": "id",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "userName",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "displayName",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name.givenName",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "name.familyName",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "emails",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "phoneNumbers",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "title",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "preferredLanguage",
          "type": "string",
          "casdoorName": "Language",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "active",
          "type": "boolean",
          "casdoorName": "IsForbidden",
          "isHashed": true,
          "values": [],
        },
      ];
    case "AWS IAM":
      return [
        {
          "name": "UserId",
          "type": "string",
          "casdoorName": "Id",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "UserName",
          "type": "string",
          "casdoorName": "Name",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "UserName",
          "type": "string",
          "casdoorName": "DisplayName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "Tags.Email",
          "type": "string",
          "casdoorName": "Email",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "Tags.Phone",
          "type": "string",
          "casdoorName": "Phone",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "Tags.FirstName",
          "type": "string",
          "casdoorName": "FirstName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "Tags.LastName",
          "type": "string",
          "casdoorName": "LastName",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "Tags.Title",
          "type": "string",
          "casdoorName": "Title",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "Tags.Department",
          "type": "string",
          "casdoorName": "Affiliation",
          "isHashed": true,
          "values": [],
        },
        {
          "name": "CreateDate",
          "type": "string",
          "casdoorName": "CreatedTime",
          "isHashed": true,
          "values": [],
        },
      ];
    default:
      return [];
    }
  }

  needSshfields() {
    return this.state.syncer.type === "Database" && (this.state.syncer.databaseType === "mysql" || this.state.syncer.databaseType === "mssql" || this.state.syncer.databaseType === "postgres");
  }

  getSyncerEditTitle(): string {
    if (this.state.mode === "add") {
      return tr("syncer:New Syncer");
    }

    return `${tr("syncer:Edit Syncer")} (${this.state.syncer.name})`;
  }

  handleBack(): void {
    this.props.history.push("/syncers");
  }

  renderEditFooter(): React.ReactNode {
    return (
      <React.Fragment>
        <Button disabled={this.state.submitting} onClick={() => this.handleBack()}>{tr("general:Cancel")}</Button>
        <Button type="primary" disabled={this.state.submitting} loading={this.state.submitting} onClick={() => this.submitSyncerEdit(false)}>{tr("general:Save")}</Button>
        <Button disabled={this.state.submitting} onClick={() => this.submitSyncerEdit(true)}>{tr("syncer:Save and return")}</Button>
      </React.Fragment>
    );
  }

  getOrganizationDisplayName(organization: NamedRecord): string {
    const displayName = organization.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : organization.name;
  }

  renderOrganizationOptions(): React.ReactNode {
    return this.state.organizations.map((organization) => {
      const displayName = this.getOrganizationDisplayName(organization);
      return (
        <Option key={organization.name} value={organization.name} label={displayName}>
          <div className="admin-large-edit-organization-option syncer-edit-organization-option">
            <span className="admin-large-edit-organization-option-name syncer-edit-organization-option-name">{displayName}</span>
            {displayName !== organization.name ? (
              <span className="admin-large-edit-organization-option-id syncer-edit-organization-option-id">{organization.name}</span>
            ) : null}
          </div>
        </Option>
      );
    });
  }

  isKnownTabKey(key: unknown): key is SyncerEditTabKey {
    return syncerEditTabKeys.includes(`${key}` as SyncerEditTabKey);
  }

  getInitialTabKey(): SyncerEditTabKey {
    const hashKey = window.location.hash?.slice(1);
    return this.isKnownTabKey(hashKey) ? hashKey : "basic";
  }

  getActiveTabKey(): SyncerEditTabKey {
    return this.isKnownTabKey(this.state.activeTabKey) ? this.state.activeTabKey : "basic";
  }

  setActiveTabKey(key: string): void {
    const nextKey = this.isKnownTabKey(key) ? key : "basic";
    this.setState({activeTabKey: nextKey});
    window.location.hash = nextKey;
  }

  renderEditTabs(): React.ReactNode {
    return (
      <LargeEditTabs
        classPrefix="syncer-edit"
        activeKey={this.getActiveTabKey()}
        onChange={(key) => this.setActiveTabKey(key)}
        items={[
          {key: "basic", label: tr("syncer:Basic information")},
          {key: "connection", label: tr("syncer:Connection configuration")},
          {key: "mapping-status", label: tr("syncer:Mapping and status")},
        ]}
      />
    );
  }

  renderSyncerForm(): React.ReactNode {
    const activeTabKey = this.getActiveTabKey();
    const errorText = typeof this.state.syncer.errorText === "string" ? this.state.syncer.errorText.trim() : "";

    return (
      <div className="syncer-edit-form-content">
        {activeTabKey === "basic" ? (
          <div className="admin-large-edit-form-content syncer-edit-tab-panel syncer-edit-tab-panel-basic">
            <h2 className="admin-large-edit-content-section-title syncer-edit-section-title">{tr("syncer:Basic information")}</h2>
            <Row style={{marginTop: "10px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("general:Organization"), tr("general:Organization - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select
                  virtual={false}
                  showSearch
                  optionLabelProp="label"
                  style={{width: "100%"}}
                  disabled={!Setting.isAdminUser(this.props.account)}
                  value={this.state.syncer.organization}
                  filterOption={(input, option) => {
                    const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
                    return optionText.includes(input.toLowerCase());
                  }}
                  onChange={(value => {this.updateSyncerField("organization", value);})}
                >
                  {this.renderOrganizationOptions()}
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("general:Name"), tr("general:Name - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Input value={this.state.syncer.name} onChange={e => {
                  this.updateSyncerField("name", e.target.value);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("general:Type"), tr("general:Type - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.syncer.type} onChange={(value => {
                  this.updateSyncerType(value);
                })}>
                  {
                    ["Database", "Keycloak", "WeCom", "Azure AD", "Active Directory", "Google Workspace", "DingTalk", "Lark", "Okta", "SCIM", "AWS IAM"]
                      .map((item, index) => <Option key={index} value={item}>{item}</Option>)
                  }
                </Select>
              </Col>
            </Row>
          </div>
        ) : null}
        {activeTabKey === "connection" ? (
          <div className="admin-large-edit-form-content syncer-edit-tab-panel syncer-edit-tab-panel-connection">
            <h2 className="admin-large-edit-content-section-title syncer-edit-section-title">{tr("syncer:Connection configuration")}</h2>
            {isEnterpriseTlsSyncer(this.state.syncer) ? (
              <EnterpriseTlsPolicyFields
                policy={this.state.syncer.tlsPolicy}
                cert={this.state.syncer.cert}
                certOptions={projectSslCertOptions(this.state.certs)}
                onPolicyChange={policy => this.updateSyncerTlsPolicy(policy)}
                onCertChange={cert => this.updateSyncerField("cert", cert)}
              />
            ) : null}
            {
              this.state.syncer.type === "WeCom" || this.state.syncer.type === "Azure AD" || this.state.syncer.type === "Active Directory" || this.state.syncer.type === "Google Workspace" || this.state.syncer.type === "DingTalk" || this.state.syncer.type === "Lark" || this.state.syncer.type === "Okta" || this.state.syncer.type === "SCIM" || this.state.syncer.type === "AWS IAM" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(tr("syncer:Database type"), tr("syncer:Database type - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Select virtual={false} style={{width: "100%"}} value={this.state.syncer.databaseType} onChange={(value => {
                      this.updateSyncerField("databaseType", value);
                      if (value === "postgres") {
                        this.updateSyncerField("sslMode", "disable");
                      } else {
                        this.updateSyncerField("sslMode", "");
                      }
                    })}>
                      {
                        [
                          {id: "mysql", name: "MySQL"},
                          {id: "postgres", name: "PostgreSQL"},
                          {id: "mssql", name: "SQL Server"},
                          {id: "oracle", name: "Oracle"},
                          {id: "sqlite3", name: "Sqlite 3"},
                        ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                      }
                    </Select>
                  </Col>
                </Row>
              )
            }
            {
              this.state.syncer.databaseType !== "postgres" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(tr("provider:SSL mode"), tr("provider:SSL mode - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Select virtual={false} style={{width: "100%"}} value={this.state.syncer.sslMode} onChange={(value => {this.updateSyncerField("sslMode", value);})}>
                      {
                        [
                          {id: "disable", name: "disable"},
                          // {id: "allow", name: "allow"},
                          // {id: "prefer", name: "prefer"},
                          {id: "require", name: "require"},
                          {id: "verify-ca", name: "verify-ca"},
                          {id: "verify-full", name: "verify-full"},
                        ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                      }
                    </Select>
                  </Col>
                </Row>
              )
            }
            {
              this.state.syncer.type === "WeCom" || this.state.syncer.type === "DingTalk" || this.state.syncer.type === "Lark" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(this.state.syncer.type === "Azure AD" ? tr("provider:Tenant ID") : this.state.syncer.type === "Google Workspace" ? tr("syncer:Admin Email") : this.state.syncer.type === "Active Directory" ? tr("ldap:Server") : this.state.syncer.type === "SCIM" ? tr("syncer:SCIM Server URL") : this.state.syncer.type === "AWS IAM" ? tr("syncer:AWS Region") : tr("provider:Host"), tr("provider:Host - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Input prefix={<LinkOutlined />} value={this.state.syncer.host} onChange={e => {
                      this.updateSyncerField("host", e.target.value);
                    }} />
                  </Col>
                </Row>
              )
            }
            {
              this.state.syncer.type === "WeCom" || this.state.syncer.type === "Azure AD" || this.state.syncer.type === "Google Workspace" || this.state.syncer.type === "DingTalk" || this.state.syncer.type === "Lark" || this.state.syncer.type === "Okta" || this.state.syncer.type === "SCIM" || this.state.syncer.type === "AWS IAM" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(this.state.syncer.type === "Active Directory" ? tr("provider:LDAP port") : tr("provider:Port"), tr("provider:Port - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <InputNumber value={this.state.syncer.port} onChange={value => {
                      this.updateSyncerField("port", value);
                    }} />
                  </Col>
                </Row>
              )
            }
            {
              this.state.syncer.type === "Google Workspace" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(
                      this.state.syncer.type === "WeCom" ? tr("syncer:Corp ID") :
                        this.state.syncer.type === "DingTalk" ? tr("provider:App Key") :
                          this.state.syncer.type === "Lark" ? tr("provider:App ID") :
                            this.state.syncer.type === "Azure AD" ? tr("provider:Client ID") :
                              this.state.syncer.type === "Active Directory" ? tr("syncer:Bind DN") :
                                this.state.syncer.type === "SCIM" ? tr("syncer:Username (optional)") :
                                  this.state.syncer.type === "AWS IAM" ? tr("syncer:AWS Access Key ID") :
                                    tr("general:User"),
                      tr("general:User - Tooltip")
                    )} :
                  </Col>
                  <Col span={22} >
                    <Input value={this.state.syncer.user} onChange={e => {
                      this.updateSyncerField("user", e.target.value);
                    }} />
                  </Col>
                </Row>
              )
            }
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(
                  this.state.syncer.type === "WeCom" ? tr("syncer:Corp secret") :
                    this.state.syncer.type === "DingTalk" ? tr("provider:App secret") :
                      this.state.syncer.type === "Lark" ? tr("provider:App secret") :
                        this.state.syncer.type === "Azure AD" ? tr("provider:Client secret") :
                          this.state.syncer.type === "Google Workspace" ? tr("syncer:Service account key") :
                            this.state.syncer.type === "SCIM" ? tr("syncer:API Token / Password") :
                              this.state.syncer.type === "AWS IAM" ? tr("syncer:AWS Secret Access Key") :
                                tr("general:Password"),
                  tr("general:Password - Tooltip")
                )} :
              </Col>
              <Col span={22} >
                {
                  this.state.syncer.type === "Google Workspace" ? (
                    <Input.TextArea rows={4} value={this.state.syncer.password} onChange={e => {
                      this.updateSyncerField("password", e.target.value);
                    }} placeholder={tr("syncer:Paste your Google Workspace service account JSON key here")} />
                  ) : (
                    <Input.Password value={this.state.syncer.password} onChange={e => {
                      this.updateSyncerField("password", e.target.value);
                    }} />
                  )
                }
              </Col>
            </Row>
            {
              this.state.syncer.type === "WeCom" || this.state.syncer.type === "Azure AD" || this.state.syncer.type === "Google Workspace" || this.state.syncer.type === "DingTalk" || this.state.syncer.type === "Lark" || this.state.syncer.type === "Okta" || this.state.syncer.type === "SCIM" || this.state.syncer.type === "AWS IAM" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(this.state.syncer.type === "Active Directory" ? tr("ldap:Base DN") : tr("syncer:Database"), tr("syncer:Database - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Input value={this.state.syncer.database} onChange={e => {
                      this.updateSyncerField("database", e.target.value);
                    }} />
                  </Col>
                </Row>
              )
            }
            {
              this.needSshfields() ? (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(tr("general:SSH type"), tr("general:SSH type - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Radio.Group value={this.state.syncer.sshType} buttonStyle="solid" onChange={e => {
                      this.updateSyncerField("sshType", e.target.value);
                    }}>
                      <Radio.Button value="">{tr("general:None")}</Radio.Button>
                      <Radio.Button value="password">{tr("general:Password")}</Radio.Button>
                      <Radio.Button value="cert">{tr("general:Cert")}</Radio.Button>
                    </Radio.Group>
                  </Col>
                </Row>
              ) : null
            }
            {
              this.state.syncer.sshType && this.needSshfields() ? (
                <React.Fragment>
                  <Row style={{marginTop: "20px"}} >
                    <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                      {Setting.getLabel(tr("syncer:SSH host"), tr("provider:Host - Tooltip"))} :
                    </Col>
                    <Col span={22} >
                      <Input prefix={<LinkOutlined />} value={this.state.syncer.sshHost} onChange={e => {
                        this.updateSyncerField("sshHost", e.target.value);
                      }} />
                    </Col>
                  </Row>
                  <Row style={{marginTop: "20px"}} >
                    <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                      {Setting.getLabel(tr("syncer:SSH port"), tr("provider:Port - Tooltip"))} :
                    </Col>
                    <Col span={22} >
                      <InputNumber value={this.state.syncer.sshPort} onChange={value => {
                        this.updateSyncerField("sshPort", value);
                      }} />
                    </Col>
                  </Row>
                  <Row style={{marginTop: "20px"}} >
                    <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                      {Setting.getLabel(tr("syncer:SSH user"), tr("general:User - Tooltip"))} :
                    </Col>
                    <Col span={22} >
                      <Input value={this.state.syncer.sshUser} onChange={e => {
                        this.updateSyncerField("sshUser", e.target.value);
                      }} />
                    </Col>
                  </Row>
                  {
                    this.state.syncer.sshType === "password" && this.needSshfields() ?
                      (
                        <Row style={{marginTop: "20px"}} >
                          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                            {Setting.getLabel(tr("syncer:SSH password"), tr("general:Password - Tooltip"))} :
                          </Col>
                          <Col span={22} >
                            <Input.Password value={this.state.syncer.sshPassword} onChange={e => {
                              this.updateSyncerField("ssh " + "sshPassword", e.target.value);
                            }} />
                          </Col>
                        </Row>
                      ) : (
                        <Row style={{marginTop: "20px"}} >
                          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                            {Setting.getLabel(tr("general:SSH cert"), tr("general:Cert - Tooltip"))} :
                          </Col>
                          <Col span={22} >
                            <Select virtual={false} style={{width: "100%"}} value={this.state.syncer.cert} onChange={(value => {this.updateSyncerField("cert", value);})}>
                              {
                                this.state?.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
                              }
                            </Select>
                          </Col>
                        </Row>
                      )
                  }
                </React.Fragment>
              ) : null
            }
            {
              this.state.syncer.type === "WeCom" || this.state.syncer.type === "Azure AD" || this.state.syncer.type === "Google Workspace" || this.state.syncer.type === "DingTalk" || this.state.syncer.type === "Lark" || this.state.syncer.type === "Okta" || this.state.syncer.type === "SCIM" || this.state.syncer.type === "AWS IAM" ? null : (
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(tr("syncer:Table"), tr("syncer:Table - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Input value={this.state.syncer.table} onChange={e => {
                      this.updateSyncerField("table", e.target.value);
                    }} />
                  </Col>
                </Row>
              )
            }
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("provider:Syncer test"), tr("provider:Syncer test - Tooltip"))} :
              </Col>
              <Col span={2} >
                <Button type={"primary"} loading={this.state.testDbLoading} onClick={() => {
                  this.setState({testDbLoading: true});
                  SyncerBackend.testSyncerDb(this.state.syncer)
                    .then((res) => {
                      if (res.status === "ok") {
                        this.setState({testDbLoading: false});
                        Setting.showMessage("success", tr("syncer:Connect successfully"));
                      } else {
                        this.setState({testDbLoading: false});
                        Setting.showMessage("error", `${tr("syncer:Failed to connect")}: ${res.msg}`);
                      }
                    })
                    .catch(error => {
                      this.setState({testDbLoading: false});
                      Setting.showMessage("error", `${tr("general:Failed to connect to server")}: ${error}`);
                    });
                }
                }>{tr("syncer:Test Connection")}</Button>
              </Col>
            </Row>
          </div>
        ) : null}
        {activeTabKey === "mapping-status" ? (
          <div className="admin-large-edit-form-content syncer-edit-tab-panel syncer-edit-tab-panel-mapping-status">
            <h2 className="admin-large-edit-content-section-title syncer-edit-section-title">{tr("syncer:Mapping and status")}</h2>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("syncer:Table columns"), tr("syncer:Table columns - Tooltip"))} :
              </Col>
              <Col span={22} >
                <SyncerTableColumnTable
                  table={this.state.syncer.tableColumns}
                  onUpdateTable={(value) => {this.updateSyncerField("tableColumns", value);}}
                />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("syncer:Affiliation table"), tr("syncer:Affiliation table - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Input value={this.state.syncer.affiliationTable} onChange={e => {
                  this.updateSyncerField("affiliationTable", e.target.value);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("syncer:Avatar base URL"), tr("syncer:Avatar base URL - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Input prefix={<LinkOutlined />} value={this.state.syncer.avatarBaseUrl} onChange={e => {
                  this.updateSyncerField("avatarBaseUrl", e.target.value);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("syncer:Sync interval"), tr("syncer:Sync interval - Tooltip"))} :
              </Col>
              <Col span={22} >
                <InputNumber value={this.state.syncer.syncInterval} onChange={value => {
                  this.updateSyncerField("syncInterval", value);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(tr("syncer:Error text"), tr("syncer:Error text - Tooltip"))} :
              </Col>
              <Col span={22} >
                <div className={`syncer-edit-error-panel ${errorText === "" ? "syncer-edit-error-empty" : "syncer-edit-error-content"}`}>
                  {errorText === "" ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <Editor
                      value={this.state.syncer.errorText}
                      fillHeight
                      readOnly
                      dark
                      lang="js"
                      onChange={(value: string) => {
                        this.updateSyncerField("errorText", value);
                      }}
                    />
                  )}
                </div>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
                {Setting.getLabel(tr("syncer:Is read-only"), tr("syncer:Is read-only - Tooltip"))} :
              </Col>
              <Col span={1} >
                <Switch checked={this.state.syncer.isReadOnly} onChange={checked => {
                  this.updateSyncerField("isReadOnly", checked);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
                {Setting.getLabel(tr("general:Is enabled"), tr("general:Is enabled - Tooltip"))} :
              </Col>
              <Col span={1} >
                <Switch checked={this.state.syncer.isEnabled} onChange={checked => {
                  this.updateSyncerField("isEnabled", checked);
                }} />
              </Col>
            </Row>
          </div>
        ) : null}
      </div>
    );
  }

  renderSyncer(): React.ReactNode {
    return (
      <Card
        className="admin-large-edit-card syncer-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="syncer-edit"
          backLabel={tr("general:Back")}
          breadcrumb={<React.Fragment>{tr("general:Authentication Source Center")} / {tr("general:Syncers")} /</React.Fragment>}
          title={this.getSyncerEditTitle()}
          tabs={this.renderEditTabs()}
          actions={this.renderEditFooter()}
          onBack={() => this.handleBack()}
        >
          {this.renderSyncerForm()}
        </LargeEditShell>
      </Card>
    );
  }

  submitSyncerEdit(exitAfterSave: boolean) {
    if (this.syncerSaveInFlight || this.state.submitting) {
      return;
    }
    const syncer = Setting.deepCopy(this.state.syncer) as SyncerEditRecord;
    const tlsValidationError = validateEnterpriseTlsPolicy(
      syncer,
      isEnterpriseTlsSyncer(syncer),
      projectSslCertOptions(this.state.certs)
    );
    if (tlsValidationError !== null) {
      Setting.showMessage("error", tr(getEnterpriseTlsPolicyErrorKey(tlsValidationError)));
      return;
    }
    this.syncerSaveInFlight = true;
    this.setState({submitting: true});
    const request = this.state.mode === "add"
      ? SyncerBackend.addSyncer(syncer)
      : SyncerBackend.updateSyncer(this.state.syncer.owner, this.state.syncerName, syncer);

    request
      .then((res) => {
        if (res.status === "ok") {
          this.syncerSaveInFlight = false;
          Setting.showMessage("success", this.state.mode === "add" ? tr("general:Successfully added") : tr("general:Successfully saved"));
          this.setState({
            syncerName: this.state.syncer.name,
            mode: "edit",
            submitting: false,
          });

          if (exitAfterSave) {
            this.props.history.push("/syncers");
          } else {
            this.props.history.push(`/syncers/${this.state.syncer.name}`);
          }
        } else {
          this.syncerSaveInFlight = false;
          Setting.showMessage("error", `${this.state.mode === "add" ? tr("general:Failed to add") : tr("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode !== "add") {
            this.updateSyncerField("name", this.state.syncerName);
          }
          this.setState({submitting: false});
        }
      })
      .catch(error => {
        this.syncerSaveInFlight = false;
        this.setState({submitting: false});
        Setting.showMessage("error", `${tr("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div className="admin-large-edit-page syncer-edit-page">
        {
          this.state.syncer !== null ? this.renderSyncer() : null
        }
      </div>
    );
  }
}

export default SyncerEditPage;
