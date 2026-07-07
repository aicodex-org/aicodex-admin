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
import {DeleteOutlined, DownOutlined, InfoCircleOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Popconfirm, Select, Table, Tooltip} from "antd";
import {EmailMfaType, PushMfaType, SmsMfaType, TotpMfaType} from "../auth/MfaSetupPage";
import {MfaRuleOptional, MfaRulePrompted, MfaRuleRequired} from "../Setting";
import * as Setting from "../Setting";
import i18nextLib from "i18next";

const {Option} = Select;

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};
const MfaMethodPlaceholder = "Please select a MFA method";

const getMfaItems = () => [
  {name: SmsMfaType, value: SmsMfaType, label: i18next.t("mfa:SMS")},
  {name: EmailMfaType, value: EmailMfaType, label: i18next.t("general:Email")},
  {name: TotpMfaType, value: TotpMfaType, label: i18next.t("mfa:Authenticator App")},
  {name: PushMfaType, value: PushMfaType, label: i18next.t("mfa:Push Notification")},
];

const RuleItems = [
  {value: MfaRuleOptional, label: i18next.t("organization:Optional")},
  {value: MfaRulePrompted, label: i18next.t("organization:Prompt")},
  {value: MfaRuleRequired, label: i18next.t("organization:Required")},
];

interface MfaTableProps {
  title?: React.ReactNode;
  table?: LegacyAny[];
  onUpdateTable: (table: LegacyAny[]) => void;
}

interface MfaTableState {
  classes: MfaTableProps;
}

class MfaTable extends React.Component<MfaTableProps, MfaTableState> {
  constructor(props: MfaTableProps) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table: LegacyAny[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny[], index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny[] = []) {
    const row = {name: Setting.getNewRowNameForTable(table, MfaMethodPlaceholder), rule: "Optional"};
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: LegacyAny[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
    Setting.showMessage("info", i18next.t("organization:MFA method removed pending save"));
  }

  upRow(table: LegacyAny[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: LegacyAny[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  renderTable(table: LegacyAny[] = []) {
    const mfaItems = getMfaItems();
    const isAddDisabled = table.length >= mfaItems.length;
    const columns: LegacyColumn[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "500px",
        render: (text, record, index) => {
          const value = String(text ?? "");
          const isPlaceholder = value.trim() === MfaMethodPlaceholder;
          const selectedMfaItem = mfaItems.find(item => item.value === value);
          const options = [
            ...(isPlaceholder ? [{name: value, value: value, label: i18next.t("organization:Please select a MFA method")}] : []),
            ...(selectedMfaItem === undefined ? [] : [selectedMfaItem]),
            ...Setting.getDeduplicatedArray(mfaItems, table, "name"),
          ];
          return (
            <Select virtual={false} size="small" style={{width: "100%"}}
              value={text}
              onChange={value => {
                this.updateField(table, index, "name", value);
              }} >
              {
                options.map((item: LegacyAny, index: number) => <Option key={index} value={item.value}>{item.label}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: i18next.t("application:Rule"),
        dataIndex: "rule",
        key: "rule",
        width: "140px",
        render: (text, record, index) => {
          return (
            <Select virtual={false} size="small" style={{width: "100%"}}
              value={text}
              defaultValue="Optional"
              options={RuleItems.map((item) =>
                Setting.getOption(item.label, item.value))
              }
              onChange={value => {
                let requiredCount = 0;
                table.forEach((item: LegacyAny) => {
                  if (item.rule === MfaRuleRequired) {
                    requiredCount++;
                  }
                });

                if (value === MfaRuleRequired && requiredCount >= 1) {
                  Setting.showMessage("error", i18next.t("general:Only 1 MFA method can be required"));
                  return;
                }
                this.updateField(table, index, "rule", value);
              }} >
            </Select>
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: "112px",
        className: "organization-config-table-action-column",
        render: (text, record, index) => {
          const isFirst = index === 0;
          const isLast = index === table.length - 1;
          const upTitle = isFirst ? i18next.t("organization:Already first MFA method") : i18next.t("organization:Move MFA method up");
          const downTitle = isLast ? i18next.t("organization:Already last MFA method") : i18next.t("organization:Move MFA method down");
          return (
            <div className="organization-config-table-row-actions organization-config-table-row-actions-icons">
              <Tooltip placement="bottomLeft" title={upTitle}>
                <span className="organization-config-table-action-trigger" aria-disabled={isFirst} aria-label={upTitle} tabIndex={isFirst ? 0 : undefined}>
                  <Button aria-label={i18next.t("organization:Move MFA method up")} disabled={isFirst} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
                </span>
              </Tooltip>
              <Tooltip placement="topLeft" title={downTitle}>
                <span className="organization-config-table-action-trigger" aria-disabled={isLast} aria-label={downTitle} tabIndex={isLast ? 0 : undefined}>
                  <Button aria-label={i18next.t("organization:Move MFA method down")} disabled={isLast} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
                </span>
              </Tooltip>
              <Popconfirm
                title={i18next.t("organization:Remove MFA method confirmation")}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
                onConfirm={() => this.deleteRow(table, index)}
              >
                <Tooltip placement="topLeft" title={i18next.t("organization:Delete MFA method")}>
                  <Button aria-label={i18next.t("organization:Delete MFA method")} icon={<DeleteOutlined />} size="small" />
                </Tooltip>
              </Popconfirm>
            </div>
          );
        },
      },
    ];

    return (
      <Table scroll={{x: "max-content"}} rowKey="name" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        locale={{emptyText: i18next.t("organization:No MFA methods")}}
        title={() => (
          <div className="organization-config-table-toolbar">
            {this.props.title === undefined || this.props.title === null ? null : (
              <span className="organization-config-table-title organization-config-table-title-with-help">
                {this.props.title}
                <Tooltip title={i18next.t("organization:MFA methods order - Tooltip", {count: mfaItems.length})}>
                  <span
                    aria-label={i18next.t("organization:MFA methods order - Tooltip", {count: mfaItems.length})}
                    className="organization-config-table-title-help-icon"
                    role="img"
                    tabIndex={0}
                  >
                    <InfoCircleOutlined />
                  </span>
                </Tooltip>
              </span>
            )}
            <Tooltip title={isAddDisabled ? i18next.t("organization:Maximum MFA methods reached", {count: mfaItems.length}) : ""}>
              <span
                aria-disabled={isAddDisabled}
                aria-label={isAddDisabled ? i18next.t("organization:Maximum MFA methods reached", {count: mfaItems.length}) : undefined}
                className="organization-config-table-add-trigger"
                tabIndex={isAddDisabled ? 0 : undefined}
              >
                <Button disabled={isAddDisabled} type="primary" size="small" onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
              </span>
            </Tooltip>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div className="organization-config-table-section mfa-table-section">
        {this.renderTable(this.props.table ?? [])}
      </div>
    );
  }
}

export default MfaTable;
