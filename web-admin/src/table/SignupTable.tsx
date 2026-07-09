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
import {Button, Input, Popover, Select, Switch, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import Editor from "../common/Editor";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

const EmailCss = ".signup-email{}\n.signup-email-input{}\n.signup-email-code{}\n.signup-email-code-input{}\n";
const PhoneCss = ".signup-phone{}\n.signup-phone-input{}\n.phone-code{}\n.signup-phone-code-input{}";

export const SignupTableDefaultCssMap: Record<string, string> = {
  "Username": ".signup-username {}\n.signup-username-input {}",
  "Display name": ".signup-first-name {}\n.signup-first-name-input{}\n.signup-last-name{}\n.signup-last-name-input{}\n.signup-name{}\n.signup-name-input{}",
  "Affiliation": ".signup-affiliation{}\n.signup-affiliation-input{}",
  "Country/Region": ".signup-country-region{}\n.signup-region-select{}",
  "ID card": ".signup-idcard{}\n.signup-idcard-input{}",
  "Password": ".signup-password{}\n.signup-password-input{}",
  "Confirm password": ".signup-confirm{}",
  "Email": EmailCss,
  "Phone": PhoneCss,
  "Email or Phone": EmailCss + PhoneCss,
  "Phone or Email": EmailCss + PhoneCss,
  "Invitation code": ".signup-invitation-code{}\n.signup-invitation-code-input{}",
  "Agreement": ".login-agreement{}",
  "Signup button": ".signup-button{}\n.signup-link{}",
  "Providers": ".provider-img {\n width: 30px;\n margin: 5px;\n }\n .provider-big-img {\n margin-bottom: 10px;\n }\n ",
};

const {Option} = Select;

class SignupTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table: LegacyAny) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    const row = {name: Setting.getNewRowNameForTable(table, "Please select a signup item"), visible: true, required: true, options: [], rule: "None", customCss: ""};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: LegacyAny, i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: LegacyAny, i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: LegacyAny, i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  renderTable(table: LegacyAny) {
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: 220,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const items = [
            {name: "Username", displayName: t("signup:Username")},
            {name: "ID", displayName: t("general:ID")},
            {name: "Display name", displayName: t("general:Display name")},
            {name: "First name", displayName: t("general:First name")},
            {name: "Last name", displayName: t("general:Last name")},
            {name: "Affiliation", displayName: t("user:Affiliation")},
            {name: "Gender", displayName: t("user:Gender")},
            {name: "Bio", displayName: t("user:Bio")},
            {name: "Tag", displayName: t("user:Tag")},
            {name: "Education", displayName: t("user:Education")},
            {name: "Country/Region", displayName: t("user:Country/Region")},
            {name: "ID card", displayName: t("user:ID card")},
            {name: "Password", displayName: t("general:Password")},
            {name: "Confirm password", displayName: t("general:Confirm")},
            {name: "Email", displayName: t("general:Email")},
            {name: "Phone", displayName: t("general:Phone")},
            {name: "Email or Phone", displayName: t("general:Email or Phone")},
            {name: "Phone or Email", displayName: t("general:Phone or Email")},
            {name: "Invitation code", displayName: t("application:Invitation code")},
            {name: "Agreement", displayName: t("signup:Agreement")},
            {name: "Signup button", displayName: t("signup:Signup button")},
            {name: "Providers", displayName: t("application:Providers")},
            {name: "Text 1", displayName: t("signup:Text 1")},
            {name: "Text 2", displayName: t("signup:Text 2")},
            {name: "Text 3", displayName: t("signup:Text 3")},
            {name: "Text 4", displayName: t("signup:Text 4")},
            {name: "Text 5", displayName: t("signup:Text 5")},
          ];

          const getItemDisplayName = (text: LegacyAny) => {
            const item = items.filter((item: LegacyAny) => item.name === text);
            if (item.length === 0) {
              return "";
            }
            return item[0].displayName;
          };

          return (
            <Select virtual={false} style={{width: "100%"}}
              value={getItemDisplayName(text)}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "name", value);
                this.updateField(table, index, "customCss", SignupTableDefaultCssMap[value]);
              }} >
              {
                Setting.getDeduplicatedArray(items, table, "name").map((item: LegacyAny, index: number) => <Option key={index} value={item.name}>{item.displayName}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: t("organization:Visible"),
        dataIndex: "visible",
        key: "visible",
        width: "80px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.name === "ID") {
            return null;
          }

          return (
            <Switch checked={text} onChange={(checked: boolean) => {
              this.updateField(table, index, "visible", checked);
              if (!checked) {
                this.updateField(table, index, "required", false);
              } else {
                this.updateField(table, index, "required", true);
              }
            }} />
          );
        },
      },
      {
        title: t("organization:Required"),
        dataIndex: "required",
        key: "required",
        width: "80px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (!record.visible || ["Signup button", "Providers"].includes(record.name)) {
            return null;
          }

          return (
            <Switch checked={text} disabled={record.name === "Password"} onChange={(checked: boolean) => {
              this.updateField(table, index, "required", checked);
            }} />
          );
        },
      },
      {
        title: t("provider:Prompted"),
        dataIndex: "prompted",
        key: "prompted",
        width: "80px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (["ID", "Signup button", "Providers"].includes(record.name)) {
            return null;
          }

          if (record.visible && record.name !== "Country/Region") {
            return null;
          }

          return (
            <Switch checked={text} onChange={(checked: boolean) => {
              this.updateField(table, index, "prompted", checked);
            }} />
          );
        },
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "160px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const options = [
            {id: "Input", name: t("application:Input")},
            {id: "Single Choice", name: t("application:Single Choice")},
            {id: "Multiple Choices", name: t("application:Multiple Choices")},
          ];

          return (
            <Select virtual={false} style={{width: "100%"}} value={text} onChange={(value => {
              this.updateField(table, index, "type", value);
            })} options={options.map((item: LegacyAny) => Setting.getOption(item.name, item.id))} />
          );
        },
      },
      {
        title: t("signup:Label"),
        dataIndex: "label",
        key: "label",
        width: "150px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.name.startsWith("Text ")) {
            return (
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor value={text} lang="html" fillHeight dark onChange={(value: LegacyAny) => {
                    this.updateField(table, index, "label", value);
                  }} />
                </div>
              } title={t("signup:Label HTML")} trigger="click">
                <Input value={text} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateField(table, index, "label", e.target.value);
                }} />
              </Popover>
            );
          }

          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "label", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("application:Custom CSS"),
        dataIndex: "customCss",
        key: "customCss",
        width: "180px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Popover placement="right" content={
              <div style={{width: "900px", height: "300px"}}>
                <Editor
                  value={text ? text : SignupTableDefaultCssMap[record.name]}
                  lang="css"
                  fillHeight
                  dark
                  onChange={(value: LegacyAny) => {
                    this.updateField(table, index, "customCss", value ? value : SignupTableDefaultCssMap[record.name]);
                  }}
                />
              </div>
            } title={t("application:CSS style")} trigger="click">
              <Input value={text ? text : SignupTableDefaultCssMap[record.name]} onChange={e => {
                this.updateField(table, index, "customCss", e.target.value ? e.target.value : SignupTableDefaultCssMap[record.name]);
              }} />
            </Popover>
          );
        },
      },
      {
        title: t("signup:Placeholder"),
        dataIndex: "placeholder",
        key: "placeholder",
        width: "110px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.name.startsWith("Text ")) {
            return null;
          }

          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "placeholder", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("signup:Options"),
        dataIndex: "options",
        key: "options",
        width: "180px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.type !== "Single Choice" && record.type !== "Multiple Choices") {
            return null;
          }

          return (
            <Select virtual={false} mode="tags" style={{width: "100%"}} value={text}
              onChange={(value => {
                this.updateField(table, index, "options", value);
              })}
              options={text?.map((option: LegacyAny) => Setting.getOption(option, option))}
            />
          );
        },
      },
      {
        title: t("signup:Regex"),
        dataIndex: "regex",
        key: "regex",
        width: "180px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.name.startsWith("Text ") || ["Password", "Confirm password", "Signup button", "Provider"].includes(record.name)) {
            return null;
          }

          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "regex", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("application:Rule"),
        dataIndex: "rule",
        key: "rule",
        width: "155px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          let options: LegacyAny[] = [];
          if (record.name === "ID") {
            options = [
              {id: "Random", name: t("application:Random")},
              {id: "Incremental", name: t("application:Incremental")},
            ];
          } else if (record.name === "Display name") {
            options = [
              {id: "None", name: t("general:None")},
              {id: "Real name", name: t("application:Real name")},
              {id: "First, last", name: t("application:First, last")},
            ];
          } else if (record.name === "Email") {
            options = [
              {id: "Normal", name: t("application:Normal")},
              {id: "No verification", name: t("application:No verification")},
            ];
          } else if (record.name === "Phone") {
            options = [
              {id: "Normal", name: t("application:Normal")},
              {id: "No verification", name: t("application:No verification")},
            ];
          } else if (record.name === "Agreement") {
            options = [
              {id: "None", name: t("application:Only signup")},
              {id: "Signin", name: t("application:Signin")},
              {id: "Signin (Default True)", name: t("application:Signin (Default True)")},
            ];
          } else if (record.name === "Providers") {
            options = [
              {id: "big", name: t("application:Big icon")},
              {id: "small", name: t("application:Small icon")},
            ];
          }

          if (options.length === 0) {
            return null;
          }

          return (
            <Select virtual={false} style={{width: "100%"}} value={text} onChange={(value => {
              this.updateField(table, index, "rule", value);
            })} options={options.map((item: LegacyAny) => Setting.getOption(item.name, item.id))} />
          );
        },
      },
      {
        title: t("general:Action"),
        key: "action",
        width: 112,
        fixed: "right" as const,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={t("general:Up")}>
                <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Down")}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Delete")}>
                <Button disabled={record.name === "Signup button"} icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table className="application-edit-ui-table application-edit-ui-table-wide application-edit-ui-table-signup-items" scroll={{x: 1660}} tableLayout="fixed" rowKey="name" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div className="organization-config-table-toolbar">
            <span className="organization-config-table-title">{this.props.title}</span>
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        {this.renderTable(this.props.table)}
      </div>
    );
  }
}

export default SignupTable;
