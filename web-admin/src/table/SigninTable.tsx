// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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
import {Button, Input, Popover, Select, Space, Switch, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import Editor from "../common/Editor";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

const {Option} = Select;

export const SigninTableDefaultCssMap: Record<string, string> = {
  "Back button": ".back-button {\n      top: 65px;\n      left: 15px;\n      position: absolute;\n}\n.back-inner-button{}",
  "Languages": ".login-languages {\n    top: 55px;\n    right: 5px;\n    position: absolute;\n}",
  "Logo": ".login-logo-box {}",
  "Signin methods": ".signin-methods {}",
  "Username": ".login-username {}\n.login-username-input{}",
  "Password": ".login-password {}\n.login-password-input{}",
  "Verification code": ".verification-code {}\n.verification-code-input{}",
  "Agreement": ".login-agreement {}",
  "Forgot password?": ".login-forget-password {\n    display: inline-flex;\n    justify-content: space-between;\n    width: 320px;\n    margin-bottom: 25px;\n}",
  "Login button": ".login-button-box {\n    margin-bottom: 5px;\n}\n.login-button {\n    width: 100%;\n}",
  "Signup link": ".login-signup-link {\n    margin-bottom: 24px;\n    display: flex;\n    justify-content: end;\n}",
  "Providers": ".provider-img {\n      width: 30px;\n      margin: 5px;\n}\n.provider-big-img {\n      margin-bottom: 10px;\n}",
};

class SigninTable extends React.Component<LegacyAny, LegacyAny> {
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
    if (key === "name" && value === "Captcha") {
      table[index]["rule"] = "pop up";
    }
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    const row = {name: Setting.getNewRowNameForTable(table, "Please select a signin item"), visible: true, required: true, rule: "None"};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  addCustomRow(table: LegacyAny) {
    const randomName = "Text " + Date.now().toString();
    const row = {name: Setting.getNewRowNameForTable(table, randomName), visible: true, isCustom: true};
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
    table = table ?? [];
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: 240,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.isCustom) {
            return <Input style={{width: "100%"}}
              value={text} onPressEnter={e => {
                this.updateField(table, index, "name", (e.target as HTMLInputElement).value);
              }} disabled>
            </Input>;
          }

          const items = [
            {name: "Signin methods", displayName: t("application:Signin methods")},
            {name: "Logo", displayName: t("general:Logo")},
            {name: "Back button", displayName: t("login:Back button")},
            {name: "Languages", displayName: t("general:Languages")},
            {name: "Username", displayName: t("signup:Username")},
            {name: "Password", displayName: t("general:Password")},
            {name: "Verification code", displayName: t("login:Verification code")},
            {name: "Providers", displayName: t("application:Providers")},
            {name: "Agreement", displayName: t("signup:Agreement")},
            {name: "Forgot password?", displayName: t("login:Forgot password?")},
            {name: "Login button", displayName: t("login:Signin button")},
            {name: "Signup link", displayName: t("general:Signup link")},
            {name: "Captcha", displayName: t("general:Captcha")},
            {name: "Auto sign in", displayName: t("login:Auto sign in")},
            {name: "Select organization", displayName: t("login:Select organization")},
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
                this.updateField(table, index, "customCss", SigninTableDefaultCssMap[value]);
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
        width: 96,
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
        title: t("signup:Label"),
        dataIndex: "label",
        key: "label",
        width: 180,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.name.startsWith("Text ") || record?.isCustom) {
            return (
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor value={record.customCss} lang="html" fillHeight dark onChange={(value: LegacyAny) => {
                    this.updateField(table, index, "customCss", value);
                  }} />
                </div>
              } title={t("signup:Label HTML")} trigger="click">
                <Input value={record.customCss} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateField(table, index, "customCss", e.target.value);
                }} />
              </Popover>
            );
          } else if (["Username", "Password", "Verification code", "Signup link", "Forgot password?", "Login button"].includes(record.name)) {
            return <Input value={text} style={{marginBottom: "10px"}} onChange={e => {
              this.updateField(table, index, "label", e.target.value);
            }} />;
          }
          return null;
        },
      },
      {
        title: t("application:Custom CSS"),
        dataIndex: "customCss",
        key: "customCss",
        width: 240,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (!record.name.startsWith("Text ") && !record?.isCustom) {
            return (
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor
                    value={text?.replaceAll("<style>", "").replaceAll("</style>", "")}
                    lang="css"
                    fillHeight
                    dark
                    onChange={(value: LegacyAny) => {
                      this.updateField(table, index, "customCss", value);
                    }}
                  />
                </div>
              } title={t("application:CSS style")} trigger="click">
                <Input value={text?.replaceAll("<style>", "").replaceAll("</style>", "")} onChange={e => {
                  this.updateField(table, index, "customCss", e.target.value);
                }} />
              </Popover>
            );
          }

          return null;
        },
      },
      {
        title: t("signup:Placeholder"),
        dataIndex: "placeholder",
        key: "placeholder",
        width: 180,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          if (record.name !== "Username" && record.name !== "Password") {
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
        title: t("application:Rule"),
        dataIndex: "rule",
        key: "rule",
        width: 170,
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          let options: LegacyAny[] = [];
          if (record.name === "Providers") {
            options = [
              {id: "big", name: t("application:Big icon")},
              {id: "small", name: t("application:Small icon")},
            ];
          }
          if (record.name === "Captcha") {
            options = [
              {id: "pop up", name: t("application:Pop up")},
              {id: "inline", name: t("application:Inline")},
            ];
          }
          if (record.name === "Forgot password?") {
            options = [
              {id: "None", name: `${t("login:Auto sign in")} - ${t("general:True")}`},
              {id: "Auto sign in - False", name: `${t("login:Auto sign in")} - ${t("general:False")}`},
            ];
          }
          if (record.name === "Languages") {
            options = [
              {id: "None", name: t("general:Default")},
              {id: "Label", name: t("signup:Label")},
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
                <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table className="application-edit-ui-table application-edit-ui-table-control application-edit-ui-table-signin-items" scroll={{x: 1220}} tableLayout="fixed" rowKey="name" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div className="organization-config-table-toolbar">
            <span className="organization-config-table-title">{this.props.title}</span>
            <Space size={8}>
              <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
              <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addCustomRow(table)}>{t("general:Add custom item")}</Button>
            </Space>
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

export default SigninTable;
