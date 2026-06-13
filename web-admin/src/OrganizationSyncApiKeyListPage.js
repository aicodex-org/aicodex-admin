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
import {Alert, Button, DatePicker, Input, Modal, Popconfirm, Space, Table, Tag, Typography} from "antd";
import {CopyOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, StopOutlined, SyncOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import dayjs from "dayjs";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as OrganizationSyncApiKeyBackend from "./backend/OrganizationSyncApiKeyBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";

const {Text} = Typography;

class OrganizationSyncApiKeyListPage extends BaseListPage {
  constructor(props) {
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

  getSelectedOrganization() {
    if (Setting.isDefaultOrganizationSelected(this.props.account)) {
      return "";
    }
    const organization = Setting.getRequestOrganization(this.props.account);
    return organization === "built-in" ? "" : organization;
  }

  newKey() {
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

  openCreateModal() {
    this.setState({
      createModalVisible: true,
      draftKey: this.newKey(),
    });
  }

  closeCreateModal() {
    this.setState({
      createModalVisible: false,
      draftKey: this.newKey(),
    });
  }

  updateDraftKey(field, value) {
    const draftKey = {
      ...this.state.draftKey,
      [field]: value,
    };
    if (field === "organization") {
      draftKey.owner = value;
    }
    this.setState({draftKey});
  }

  showIssuedSecret(result) {
    this.setState({
      secretModalVisible: true,
      issuedSecret: result?.secret || "",
    });
  }

  copyIssuedSecret() {
    copy(this.state.issuedSecret);
    Setting.showMessage("success", i18next.t("general:Successfully copied"));
  }

  addKey() {
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
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({operating: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  rotateKey(record) {
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
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  disableKey(record) {
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
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteKey(record) {
    this.setState({operating: true});
    OrganizationSyncApiKeyBackend.deleteOrganizationSyncApiKey(record)
      .then((res) => {
        this.setState({operating: false});
        if (res.status === "ok") {
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: this.state.pagination.current > 1 && this.state.data.length === 1 ? this.state.pagination.current - 1 : this.state.pagination.current,
            },
          });
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({operating: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  isExpired(record) {
    return record?.expireTime && dayjs(record.expireTime).isValid() && !dayjs().isBefore(dayjs(record.expireTime));
  }

  renderState(record) {
    if (this.isExpired(record)) {
      return <Tag color="red">Expired</Tag>;
    }
    if (record.state === "Active") {
      return <Tag color="green">Active</Tag>;
    }
    return <Tag color="default">{record.state || "Disabled"}</Tag>;
  }

  renderDate(text, emptyText = "-") {
    if (!text) {
      return emptyText;
    }
    return Setting.getFormattedDate(text);
  }

  renderCreateModal() {
    const draftKey = this.state.draftKey;
    return (
      <Modal
        title="创建组织同步密钥"
        open={this.state.createModalVisible}
        onOk={() => this.addKey()}
        confirmLoading={this.state.operating}
        onCancel={() => this.closeCreateModal()}
        okText={i18next.t("general:Add")}
      >
        <Space direction="vertical" style={{width: "100%"}} size="middle">
          <div>
            <Text strong>组织</Text>
            <OrganizationSelect
              initValue={draftKey.organization}
              excludedOrganizations={["built-in"]}
              style={{width: "100%", marginTop: 8}}
              onChange={(value) => this.updateDraftKey("organization", value)}
            />
          </div>
          <div>
            <Text strong>{i18next.t("general:Name")}</Text>
            <Input
              value={draftKey.name}
              style={{marginTop: 8}}
              onChange={e => this.updateDraftKey("name", e.target.value)}
            />
          </div>
          <div>
            <Text strong>{i18next.t("general:Display name")}</Text>
            <Input
              value={draftKey.displayName}
              style={{marginTop: 8}}
              onChange={e => this.updateDraftKey("displayName", e.target.value)}
            />
          </div>
          <div>
            <Text strong>{i18next.t("general:Expire time")}</Text>
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

  renderSecretModal() {
    return (
      <Modal
        title="组织同步密钥明文"
        open={this.state.secretModalVisible}
        onCancel={() => this.setState({secretModalVisible: false, issuedSecret: ""})}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => this.copyIssuedSecret()}>
            {i18next.t("general:Copy")}
          </Button>,
          <Button key="close" onClick={() => this.setState({secretModalVisible: false, issuedSecret: ""})}>
            {i18next.t("general:Close")}
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

  renderTable(keys) {
    const columns = [
      {
        title: i18next.t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "150px",
        fixed: "left",
        render: (text) => (
          <Link to={`/organizations/${text}`}>
            {text}
          </Link>
        ),
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "190px",
        ...this.getColumnSearchProps("name"),
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "190px",
      },
      {
        title: "Key Prefix",
        dataIndex: "keyPrefix",
        key: "keyPrefix",
        width: "170px",
        render: (text) => <Text code>{text}</Text>,
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "120px",
        render: (text, record) => this.renderState(record),
      },
      {
        title: i18next.t("general:Expire time"),
        dataIndex: "expireTime",
        key: "expireTime",
        width: "170px",
        render: (text) => this.renderDate(text, "永不过期"),
      },
      {
        title: "Last used time",
        dataIndex: "lastUsedTime",
        key: "lastUsedTime",
        width: "170px",
        render: (text) => this.renderDate(text),
      },
      {
        title: "Last used IP",
        dataIndex: "lastUsedIp",
        key: "lastUsedIp",
        width: "140px",
        render: (text) => text || "-",
      },
      {
        title: "Last user-agent",
        dataIndex: "lastUsedUserAgent",
        key: "lastUsedUserAgent",
        width: "220px",
        ellipsis: true,
        render: (text) => text || "-",
      },
      {
        title: "Created by",
        dataIndex: "createdBy",
        key: "createdBy",
        width: "180px",
        render: (text) => text || "-",
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "260px",
        fixed: Setting.isMobile() ? "false" : "right",
        render: (text, record) => (
          <Space wrap>
            <Popconfirm
              title={`确认轮换组织同步密钥: ${record.name} ?`}
              onConfirm={() => this.rotateKey(record)}
              okText={i18next.t("general:OK")}
              cancelText={i18next.t("general:Cancel")}
            >
              <Button icon={<SyncOutlined />} loading={this.state.operating}>轮换</Button>
            </Popconfirm>
            {record.state === "Active" && (
              <Popconfirm
                title={`确认禁用组织同步密钥: ${record.name} ?`}
                onConfirm={() => this.disableKey(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Button icon={<StopOutlined />} loading={this.state.operating}>禁用</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title={i18next.t("general:Sure to delete") + `: ${record.name} ?`}
              onConfirm={() => this.deleteKey(record)}
              okText={i18next.t("general:OK")}
              cancelText={i18next.t("general:Cancel")}
            >
              <Button danger icon={<DeleteOutlined />} loading={this.state.operating}>{i18next.t("general:Delete")}</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={keys}
          rowKey={(record) => `${record.owner}/${record.name}`}
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <Space>
              <span>组织同步密钥</span>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => this.openCreateModal()}>
                {i18next.t("general:Add")}
              </Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => this.fetch({pagination: this.state.pagination})}>
                {i18next.t("general:Refresh")}
              </Button>
            </Space>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
        {this.renderCreateModal()}
        {this.renderSecretModal()}
      </div>
    );
  }

  fetch = (params = {}) => {
    const pagination = params.pagination || this.state.pagination;
    this.setState({loading: true});
    OrganizationSyncApiKeyBackend.getOrganizationSyncApiKeys(this.getSelectedOrganization())
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data || [],
            pagination: {
              ...pagination,
              total: (res.data || []).length,
            },
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
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  };
}

export default OrganizationSyncApiKeyListPage;
