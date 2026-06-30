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
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Col, Input, Row, Select, Switch, Table, Tooltip} from "antd";
import {CountryCodeSelect} from "../common/select/CountryCodeSelect";
import * as Setting from "../Setting";
import i18nextLib from "i18next";
import * as Provider from "../auth/Provider";

const {Option} = Select;

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};

interface ProviderInfo {
  name?: string;
  displayName?: string;
  category?: string;
  type?: string;
  owner?: string;
  [key: string]: LegacyAny;
}

interface ProviderTableRow {
  name: string;
  provider?: ProviderInfo;
  canSignUp?: boolean;
  canSignIn?: boolean;
  canUnlink?: boolean;
  prompted?: boolean;
  signupGroup?: string;
  rule?: string;
  bindingRule?: string[];
  countryCodes?: string[];
  [key: string]: LegacyAny;
}

interface ProviderTableProps {
  title?: React.ReactNode;
  table?: ProviderTableRow[] | null;
  providers: ProviderInfo[];
  application: {
    enableSignUp?: boolean;
    organizationObj?: {
      name?: string;
      countryCodes?: string[];
      [key: string]: LegacyAny;
    };
    [key: string]: LegacyAny;
  };
  onUpdateTable: (table: ProviderTableRow[]) => void;
}

interface ProviderTableState {
  classes: ProviderTableProps;
}

class ProviderTable extends React.Component<ProviderTableProps, ProviderTableState> {
  constructor(props: ProviderTableProps) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  getUserOrganization() {
    return this.props.application?.organizationObj;
  }

  updateTable(table: ProviderTableRow[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: ProviderTableRow[], index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table?: ProviderTableRow[] | null) {
    table = Array.isArray(table) ? table : [];
    const row = {name: Setting.getNewRowNameForTable(table, "Please select a provider"), canSignUp: true, canSignIn: true, canUnlink: true, prompted: false, signupGroup: "", rule: "None"};
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: ProviderTableRow[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: ProviderTableRow[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: ProviderTableRow[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  renderTable(table?: ProviderTableRow[] | null) {
    table = Array.isArray(table) ? table : [];
    let columns: LegacyColumn[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: 190,
        render: (text, record, index) => {
          return (
            <Select virtual={false} style={{width: "100%"}}
              showSearch
              optionFilterProp="label"
              value={text}
              onChange={value => {
                this.updateField(table, index, "name", value);
                const provider = Setting.getArrayItem(this.props.providers, "name", value);
                this.updateField(table, index, "provider", provider);

                // If the provider is email or SMS, set the rule to "all" instead of the default "None"
                if (provider.category === "Email" || provider.category === "SMS") {
                  this.updateField(table, index, "rule", "All");
                }
              }} >
              {
                Setting.getDeduplicatedArray(this.props.providers, table, "name").map((provider: LegacyAny, index: number) => (
                  <Option key={index} value={provider.name} label={`${provider.name} ${provider.displayName || ""}`}>
                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                      <img width={20} height={20} src={Setting.getProviderLogoURL(provider)} alt={provider.type} />
                      <span>{provider.displayName && provider.displayName !== provider.name ? `${provider.name} (${provider.displayName})` : provider.name}</span>
                    </div>
                  </Option>
                ))
              }
            </Select>
          );
        },
      },
      {
        title: i18next.t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: 90,
        render: (text, record, index) => {
          const provider = Setting.getArrayItem(this.props.providers, "name", record.name);
          const owner = provider?.owner || this.getUserOrganization()?.name;
          const editUrl = provider && owner && provider.name ? `/providers/${owner}/${provider.name}` : null;
          const categoryText = provider?.category;
          if (editUrl && categoryText) {
            return (
              <a href={editUrl} target="_blank" rel="noopener noreferrer">
                {categoryText}
              </a>
            );
          }
          return categoryText;
        },
      },
      {
        title: i18next.t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: 72,
        render: (text, record, index) => {
          const provider = Setting.getArrayItem(this.props.providers, "name", record.name);
          const owner = provider?.owner || this.getUserOrganization()?.name;
          const editUrl = provider && owner && provider.name ? `/providers/${owner}/${provider.name}` : null;
          const typeWidget = Provider.getProviderLogoWidget(provider, {disableLink: !!editUrl});
          if (editUrl && typeWidget) {
            return (
              <a href={editUrl} target="_blank" rel="noopener noreferrer">
                {typeWidget}
              </a>
            );
          }
          return typeWidget;
        },
      },
      {
        title: i18next.t("user:Country/Region"),
        dataIndex: "countryCodes",
        key: "countryCodes",
        width: 120,
        render: (text, record, index) => {
          if (record.provider?.category !== "SMS") {
            return null;
          }

          return (
            <CountryCodeSelect
              style={{width: "100%"}}
              hasDefault={true}
              mode={"multiple"}
              initValue={text ? text : ["All"]}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "countryCodes", value);
              }}
              countryCodes={this.getUserOrganization()?.countryCodes}
            />
          );
        },
      },
      {
        title: i18next.t("provider:Can signup"),
        dataIndex: "canSignUp",
        key: "canSignUp",
        width: 92,
        render: (text, record, index) => {
          if (!["OAuth", "Web3", "SAML"].includes(record.provider?.category)) {
            return null;
          }

          return (
            <Switch checked={text} onChange={checked => {
              this.updateField(table, index, "canSignUp", checked);
            }} />
          );
        },
      },
      {
        title: i18next.t("provider:Can signin"),
        dataIndex: "canSignIn",
        key: "canSignIn",
        width: 92,
        render: (text, record, index) => {
          if (!["OAuth", "Web3", "SAML"].includes(record.provider?.category)) {
            return null;
          }

          return (
            <Switch checked={text} onChange={checked => {
              this.updateField(table, index, "canSignIn", checked);
            }} />
          );
        },
      },
      {
        title: Setting.getLabel(i18next.t("provider:Can unlink"), i18next.t("provider:Can unlink - Tooltip")),
        dataIndex: "canUnlink",
        key: "canUnlink",
        width: 92,
        render: (text, record, index) => {
          if (!["OAuth", "Web3", "SAML"].includes(record.provider?.category)) {
            return null;
          }

          return (
            <Switch checked={text} onChange={checked => {
              this.updateField(table, index, "canUnlink", checked);
            }} />
          );
        },
      },
      {
        title: Setting.getLabel(i18next.t("provider:Binding rule"), i18next.t("provider:Binding rule - Tooltip")),
        dataIndex: "bindingRule",
        key: "bindingRule",
        width: 126,
        render: (text, record, index) => {
          if (!["OAuth", "Web3", "SAML"].includes(record.provider?.category)) {
            return null;
          }
          // bindingRule 缺失表示未配置；这里仅展示运行时默认值，不把 Email 写回表单数据。
          const hasExplicitBindingRule = Array.isArray(text);

          return (
            <div>
              <Select virtual={false} style={{width: "100%"}}
                value={hasExplicitBindingRule ? text : []}
                placeholder={i18next.t("provider:Runtime default email binding")}
                mode={"multiple"}
                onChange={value => {
                  this.updateField(table, index, "bindingRule", value);
                }} >
                <Option key="Email" value="Email">{i18next.t("general:Email")}</Option>
                <Option key="Name" value="Name">{i18next.t("general:Name")}</Option>
                <Option key="Phone" value="Phone">{i18next.t("general:Phone")}</Option>
              </Select>
              {!hasExplicitBindingRule && (
                <div style={{marginTop: "4px", color: "rgba(0, 0, 0, 0.45)", fontSize: "12px", lineHeight: "18px"}}>
                  {i18next.t("provider:Runtime default email binding")}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: Setting.getLabel(i18next.t("provider:Prompted"), i18next.t("provider:Prompted - Tooltip")),
        dataIndex: "prompted",
        key: "prompted",
        width: 112,
        render: (text, record, index) => {
          if (!["OAuth", "Web3", "SAML"].includes(record.provider?.category)) {
            return null;
          }

          return (
            <Switch checked={text} onChange={checked => {
              this.updateField(table, index, "prompted", checked);
            }} />
          );
        },
      },
      {
        title: Setting.getLabel(i18next.t("provider:Signup group"), i18next.t("provider:Signup group - Tooltip")),
        dataIndex: "signupGroup",
        key: "signupGroup",
        width: 112,
        render: (text, record, index) => {
          if (!["OAuth", "Web3"].includes(record.provider?.category)) {
            return null;
          }

          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "signupGroup", e.target.value);
            }} />
          );
        },
      },
      {
        title: Setting.getLabel(i18next.t("application:Rule"), i18next.t("provider:Provider rule - Tooltip")),
        dataIndex: "rule",
        key: "rule",
        width: 132,
        render: (text, record, index) => {
          if (record.provider?.type === "Google") {
            if (text === "None") {
              text = "Default";
            }
            return (
              <Select virtual={false} style={{width: "100%"}}
                value={text}
                defaultValue="Default"
                onChange={value => {
                  this.updateField(table, index, "rule", value);
                }} >
                <Option key="Default" value="Default">{i18next.t("general:Default")}</Option>
                <Option key="OneTap" value="OneTap">{"One Tap"}</Option>
              </Select>
            );
          } else if (record.provider?.category === "Captcha") {
            return (
              <Select virtual={false} style={{width: "100%"}}
                value={text}
                defaultValue="None"
                onChange={value => {
                  this.updateField(table, index, "rule", value);
                }} >
                <Option key="None" value="None">{i18next.t("general:None")}</Option>
                <Option key="Dynamic" value="Dynamic">{i18next.t("application:Dynamic")}</Option>
                <Option key="Always" value="Always">{i18next.t("application:Always")}</Option>
                <Option key="Internet-Only" value="Internet-Only">{i18next.t("application:Internet-Only")}</Option>
              </Select>
            );
          } else if (record.provider?.category === "SMS" || record.provider?.category === "Email") {
            if (text === "None") {
              text = "All";
            }
            return (
              <Select virtual={false} style={{width: "100%"}}
                value={text}
                defaultValue="All"
                onChange={value => {
                  this.updateField(table, index, "rule", value);
                }}>
                <Option key="all" value="all">{"All"}</Option>
                <Option key="signup" value="signup">{"Signup"}</Option>
                <Option key="login" value="login">{"Login"}</Option>
                <Option key="forget" value="forget">{"Forget Password"}</Option>
                <Option key="reset" value="reset">{"Reset Password"}</Option>
                <Option key="mfaSetup" value="mfaSetup">{"Set MFA"}</Option>
                <Option key="mfaAuth" value="mfaAuth">{"MFA Auth"}</Option>
              </Select>
            );
          } else {
            return null;
          }
        },
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: 88,
        render: (text, record, index) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={i18next.t("general:Up")}>
                <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={i18next.t("general:Down")}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={i18next.t("general:Delete")}>
                <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    if (!this.props.application.enableSignUp) {
      columns = columns.filter(column => column.key !== "canSignUp");
    }

    const hasSmsProvider = table.some(item => {
      const provider = item.provider || Setting.getArrayItem(this.props.providers, "name", item.name);
      return provider?.category === "SMS";
    });
    if (!hasSmsProvider) {
      columns = columns.filter(column => column.key !== "countryCodes");
    }

    return (
      <Table scroll={{x: 1260}} tableLayout="fixed" rowKey="name" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        <Row style={{marginTop: "20px"}} >
          <Col span={24}>
            {
              this.renderTable(this.props.table)
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default ProviderTable;
