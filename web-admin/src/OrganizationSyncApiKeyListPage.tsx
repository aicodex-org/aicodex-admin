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
import {Link} from "react-router-dom";
import {Alert, Button, DatePicker, Input, Modal, Popconfirm, Space, Tag, Typography} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {CopyOutlined, PlusOutlined, ReloadOutlined, StopOutlined, SyncOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import dayjs from "dayjs";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowActionButton, ListPageRowDeleteAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import * as Setting from "./Setting";
import * as OrganizationSyncApiKeyBackend from "./backend/OrganizationSyncApiKeyBackend";
import type {OrganizationSyncApiKeyRecord} from "./backend/OrganizationSyncApiKeyBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";

const {Text} = Typography;

interface OrganizationSyncApiKeyListPageProps {
  account?: Record<string, unknown>;
  history?: {
    push: (path: string) => void;
  };
  match?: {
    path?: string;
    params?: {
      organizationName?: string;
    };
  };
}

interface OrganizationSyncApiKeyListPageState {
  createModalVisible: boolean;
  secretModalVisible: boolean;
  issuedSecret: string;
  draftKey: OrganizationSyncApiKeyRecord;
  operating: boolean;
  loading: boolean;
  data: OrganizationSyncApiKeyRecord[];
  pagination: TablePaginationConfig;
  searchText?: string | number;
  searchedColumn?: string;
  isAuthorized?: boolean;
}

type OrganizationSyncApiKeyListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: string | number;
};

type OrganizationSyncApiKeyColumns = TableProps<OrganizationSyncApiKeyRecord>["columns"];

// 旧 BaseListPage 仍是 JS 文件，这里只声明本页面用到的继承边界，避免把基类迁移扩大到本 change。
type LegacyBaseListPageCompat = React.Component<OrganizationSyncApiKeyListPageProps, OrganizationSyncApiKeyListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<OrganizationSyncApiKeyRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: OrganizationSyncApiKeyListPageProps): LegacyBaseListPageCompat;
};

const queryFields = [
  {label: t("general:Organization"), value: "organization"},
  {label: t("general:Name"), value: "name"},
  {label: t("general:Display name"), value: "displayName"},
  {label: "Key Prefix", value: "keyPrefix"},
  {label: t("general:State"), value: "state"},
  {label: "Created by", value: "createdBy"},
];

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

class OrganizationSyncApiKeyListPage extends TypedBaseListPage {
  constructor(props: OrganizationSyncApiKeyListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      createModalVisible: false,
      secretModalVisible: false,
      issuedSecret: "",
      draftKey: this.newKey(),
      operating: false,
    };
  }

  getSelectedOrganization(): string {
    if (Setting.isDefaultOrganizationSelected(this.props.account)) {
      return "";
    }
    const organization = Setting.getRequestOrganization(this.props.account);
    return organization && organization !== "built-in" ? organization : "";
  }

  newKey(): OrganizationSyncApiKeyRecord {
    const randomName = Setting.getRandomName();
    const organization = this.getSelectedOrganization();
    return {
      owner: organization,
      name: `sync-key-${randomName}`,
      displayName: `组织同步密钥-${randomName}`,
      organization,
      expireTime: "",
      state: "Active",
    };
  }

  openCreateModal(): void {
    this.setState({
      createModalVisible: true,
      draftKey: this.newKey(),
    });
  }

  closeCreateModal(): void {
    this.setState({
      createModalVisible: false,
      draftKey: this.newKey(),
    });
  }

  updateDraftKey(field: keyof OrganizationSyncApiKeyRecord, value: string): void {
    const draftKey = {
      ...this.state.draftKey,
      [field]: value,
    };
    if (field === "organization") {
      draftKey.owner = value;
    }
    this.setState({draftKey});
  }

  showIssuedSecret(result?: OrganizationSyncApiKeyRecord): void {
    this.setState({
      secretModalVisible: true,
      issuedSecret: result?.secret || "",
    });
  }

  copyIssuedSecret(): void {
    copy(this.state.issuedSecret);
    Setting.showMessage("success", t("general:Successfully copied"));
  }

  addKey(): void {
    const key = this.state.draftKey;
    if (!key.organization || key.organization === "built-in") {
      Setting.showMessage("error", "请选择非 built-in 的业务组织");
      return;
    }

    this.setState({operating: true});
    OrganizationSyncApiKeyBackend.addOrganizationSyncApiKey(key)
      .then((res) => {
        this.setState({operating: false});
        if (res.status === "ok") {
          this.setState({createModalVisible: false});
          this.showIssuedSecret(res.data);
          this.fetch({pagination: this.state.pagination});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({operating: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  rotateKey(record: OrganizationSyncApiKeyRecord): void {
    this.setState({operating: true});
    OrganizationSyncApiKeyBackend.rotateOrganizationSyncApiKey(record)
      .then((res) => {
        this.setState({operating: false});
        if (res.status === "ok") {
          this.showIssuedSecret(res.data);
          this.fetch({pagination: this.state.pagination});
          Setting.showMessage("success", "组织同步密钥已轮换");
        } else {
          Setting.showMessage("error", `组织同步密钥轮换失败: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({operating: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  disableKey(record: OrganizationSyncApiKeyRecord): void {
    this.setState({operating: true});
    OrganizationSyncApiKeyBackend.disableOrganizationSyncApiKey(record)
      .then((res) => {
        this.setState({operating: false});
        if (res.status === "ok") {
          this.fetch({pagination: this.state.pagination});
          Setting.showMessage("success", "组织同步密钥已禁用");
        } else {
          Setting.showMessage("error", `组织同步密钥禁用失败: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({operating: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteKey(record: OrganizationSyncApiKeyRecord): void {
    this.setState({operating: true});
    OrganizationSyncApiKeyBackend.deleteOrganizationSyncApiKey(record)
      .then((res) => {
        this.setState({operating: false});
        if (res.status === "ok") {
          const current = this.state.pagination.current || 1;
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: current > 1 && this.state.data.length === 1 ? current - 1 : current,
            },
          });
          Setting.showMessage("success", t("general:Successfully deleted"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({operating: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  isExpired(record?: OrganizationSyncApiKeyRecord): boolean {
    return Boolean(record?.expireTime && dayjs(record.expireTime).isValid() && !dayjs().isBefore(dayjs(record.expireTime)));
  }

  renderState(record: OrganizationSyncApiKeyRecord): React.ReactNode {
    if (this.isExpired(record)) {
      return <Tag color="red">Expired</Tag>;
    }
    if (record.state === "Active") {
      return <Tag color="green">Active</Tag>;
    }
    return <Tag color="default">{record.state || "Disabled"}</Tag>;
  }

  renderDate(text?: string, emptyText = "-"): string {
    if (!text) {
      return emptyText;
    }
    return Setting.getFormattedDate(text) || emptyText;
  }

  filterKeys(keys: OrganizationSyncApiKeyRecord[], params: OrganizationSyncApiKeyListFetchParams): OrganizationSyncApiKeyRecord[] {
    const field = params.searchedColumn;
    const value = params.searchText === undefined ? "" : String(params.searchText).trim().toLowerCase();
    if (!field || value === "") {
      return keys;
    }

    return keys.filter((key) => String((key as Record<string, unknown>)[field] ?? "").toLowerCase().includes(value));
  }

  renderCreateModal(): React.ReactNode {
    const draftKey = this.state.draftKey;
    return (
      <Modal
        title="创建组织同步密钥"
        open={this.state.createModalVisible}
        onOk={() => this.addKey()}
        confirmLoading={this.state.operating}
        onCancel={() => this.closeCreateModal()}
        okText={t("general:Add")}
      >
        <Space direction="vertical" style={{width: "100%"}} size="middle">
          <div>
            <Text strong>组织</Text>
            <OrganizationSelect
              initValue={draftKey.organization || ""}
              excludedOrganizations={["built-in"]}
              style={{width: "100%", marginTop: 8}}
              onChange={(value: string) => this.updateDraftKey("organization", value)}
            />
          </div>
          <div>
            <Text strong>{t("general:Name")}</Text>
            <Input
              value={draftKey.name}
              style={{marginTop: 8}}
              onChange={e => this.updateDraftKey("name", e.target.value)}
            />
          </div>
          <div>
            <Text strong>{t("general:Display name")}</Text>
            <Input
              value={draftKey.displayName}
              style={{marginTop: 8}}
              onChange={e => this.updateDraftKey("displayName", e.target.value)}
            />
          </div>
          <div>
            <Text strong>{t("general:Expire time")}</Text>
            <DatePicker
              showTime
              allowClear
              value={draftKey.expireTime ? dayjs(draftKey.expireTime) : null}
              style={{width: "100%", marginTop: 8}}
              onChange={value => this.updateDraftKey("expireTime", value ? value.toISOString() : "")}
            />
          </div>
        </Space>
      </Modal>
    );
  }

  renderSecretModal(): React.ReactNode {
    return (
      <Modal
        title="组织同步密钥明文"
        open={this.state.secretModalVisible}
        onCancel={() => this.setState({secretModalVisible: false, issuedSecret: ""})}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => this.copyIssuedSecret()}>
            {t("general:Copy")}
          </Button>,
          <Button key="close" onClick={() => this.setState({secretModalVisible: false, issuedSecret: ""})}>
            {t("general:Close")}
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{width: "100%"}} size="middle">
          <Alert type="warning" showIcon message="明文只在本次创建或轮换后显示一次，请复制到网关组织同步配置中。" />
          <Input.TextArea value={this.state.issuedSecret} autoSize={{minRows: 3, maxRows: 6}} readOnly />
        </Space>
      </Modal>
    );
  }

  renderTable(keys: OrganizationSyncApiKeyRecord[]): React.ReactNode {
    const columns: OrganizationSyncApiKeyColumns = [
      {
        title: t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "100px",
        fixed: "left",
        render: (text: string) => (
          <Link to={`/organizations/${text}`}>
            {text}
          </Link>
        ),
      },
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "120px",
      },
      {
        title: "Key Prefix",
        dataIndex: "keyPrefix",
        key: "keyPrefix",
        width: "100px",
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "80px",
        render: (_text: string, record: OrganizationSyncApiKeyRecord) => this.renderState(record),
      },
      {
        title: t("general:Expire time"),
        dataIndex: "expireTime",
        key: "expireTime",
        width: "110px",
        render: (text?: string) => this.renderDate(text, "永不过期"),
      },
      {
        title: "Last used time",
        dataIndex: "lastUsedTime",
        key: "lastUsedTime",
        width: "110px",
        render: (text?: string) => this.renderDate(text),
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "150px",
        fixed: Setting.isMobile() ? false : "right",
        render: (_text: unknown, record: OrganizationSyncApiKeyRecord) => (
          <ListPageRowActions className="organization-sync-api-key-row-actions" wrap>
            <Popconfirm
              title={`确认轮换组织同步密钥: ${record.name} ?`}
              onConfirm={() => this.rotateKey(record)}
              okText={t("general:OK")}
              cancelText={t("general:Cancel")}
            >
              <ListPageRowActionButton icon={<SyncOutlined />} loading={this.state.operating}>轮换</ListPageRowActionButton>
            </Popconfirm>
            {record.state === "Active" && (
              <Popconfirm
                title={`确认禁用组织同步密钥: ${record.name} ?`}
                onConfirm={() => this.disableKey(record)}
                okText={t("general:OK")}
                cancelText={t("general:Cancel")}
              >
                <ListPageRowActionButton icon={<StopOutlined />} loading={this.state.operating}>禁用</ListPageRowActionButton>
              </Popconfirm>
            )}
            <ListPageRowDeleteAction
              title={t("general:Sure to delete") + `: ${record.name} ?`}
              onConfirm={() => this.deleteKey(record)}
              loading={this.state.operating}
            />
          </ListPageRowActions>
        ),
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell organization-sync-api-key-list-page-table-shell">
        <ListPageTable<OrganizationSyncApiKeyRecord>
          columns={columns}
          dataSource={keys}
          rowKey={(record) => `${record.owner || ""}/${record.name || ""}`}
          pagination={paginationProps}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title="组织同步密钥"
              total={this.state.pagination.total}
              fields={queryFields}
              defaultField="name"
              actions={(
                <>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => this.openCreateModal()}>
                    {t("general:Add")}
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={() => this.fetch({pagination: this.state.pagination})}>
                    {t("general:Refresh")}
                  </Button>
                </>
              )}
            />
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
        {this.renderCreateModal()}
        {this.renderSecretModal()}
      </div>
    );
  }

  fetch = (params: OrganizationSyncApiKeyListFetchParams = {}): void => {
    const pagination = params.pagination || this.state.pagination;
    this.setState({loading: true});
    OrganizationSyncApiKeyBackend.getOrganizationSyncApiKeys(this.getSelectedOrganization())
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          const data = this.filterKeys(res.data || [], params);
          this.setState({
            data,
            pagination: {
              ...pagination,
              total: data.length,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          if (Setting.isResponseDenied(res)) {
            this.setState({
              isAuthorized: false,
            });
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      })
      .catch(error => {
        this.setState({loading: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  };
}

export default OrganizationSyncApiKeyListPage;
