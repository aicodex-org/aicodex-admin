// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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
import {Button, Checkbox, Input, Popconfirm, Select, Switch, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18nextLib from "i18next";

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};
const AccountItemPlaceholder = "Please select an account item";

interface AccountTableProps {
  title?: React.ReactNode;
  table?: LegacyAny[];
  onUpdateTable: (table: LegacyAny[]) => void;
}

interface AccountTableState {
  classes: AccountTableProps;
  searchText: string;
  showEditableOnly: boolean;
  showHiddenOnly: boolean;
  showRegexOnly: boolean;
}

class AccountTable extends React.Component<AccountTableProps, AccountTableState> {
  constructor(props: AccountTableProps) {
    super(props);
    this.state = {
      classes: props,
      searchText: "",
      showEditableOnly: false,
      showHiddenOnly: false,
      showRegexOnly: false,
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
    const row = {name: Setting.getNewRowNameForTable(table, AccountItemPlaceholder), visible: true, viewRule: "Public", modifyRule: "Self", tab: ""};
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: LegacyAny[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: LegacyAny[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: LegacyAny[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  getAccountItemLabelParts(item: LegacyAny): {primary: string; secondary: string} {
    const primary = String(item.label ?? item.name ?? "");
    const secondary = item.label === item.name ? "" : String(item.name ?? "");
    return {primary, secondary};
  }

  formatAccountItemSearchText(item: LegacyAny): string {
    const {primary, secondary} = this.getAccountItemLabelParts(item);
    return `${primary} ${secondary}`.trim();
  }

  renderAccountItemLabel(item: LegacyAny): React.ReactNode {
    const {primary, secondary} = this.getAccountItemLabelParts(item);
    return (
      <span className="organization-account-item-label">
        <span className="organization-account-item-label-primary">{primary}</span>
        {secondary === "" ? null : <span className="organization-account-item-label-secondary">{secondary}</span>}
      </span>
    );
  }

  getAccountItemOptions(table: LegacyAny[], rowIndex: number, value: LegacyAny) {
    const items = Setting.GetTranslatedUserItems();
    const selectedItemsInOtherRows = table.filter((_, tableIndex) => tableIndex !== rowIndex);
    const options = Setting.getDeduplicatedArray(items, selectedItemsInOtherRows, "name");

    if (value !== undefined && value !== null && !options.some((item: LegacyAny) => item.name === value)) {
      options.unshift({
        name: value,
        label: value === AccountItemPlaceholder ? i18next.t("organization:Please select an account item") : value,
      });
    }

    return options.map((item: LegacyAny) => Setting.getOption(this.renderAccountItemLabel(item), item.name));
  }

  getRowIndex(record: LegacyAny, fallbackIndex: number): number {
    return typeof record.__accountItemIndex === "number" ? record.__accountItemIndex : fallbackIndex;
  }

  getFilteredRows(table: LegacyAny[] = []) {
    const items = Setting.GetTranslatedUserItems();
    const searchText = this.state.searchText.trim().toLowerCase();

    return table
      .map((row, index) => ({...row, __accountItemIndex: index}))
      .filter((row) => {
        if (this.state.showEditableOnly && (row.visible === false || row.modifyRule === "Immutable")) {
          return false;
        }
        if (this.state.showHiddenOnly && row.visible !== false) {
          return false;
        }
        if (this.state.showRegexOnly && `${row.regex ?? ""}`.trim() === "") {
          return false;
        }
        if (searchText === "") {
          return true;
        }

        const item = items.find((candidate: LegacyAny) => candidate.name === row.name);
        const accountItemText = item === undefined ? `${row.name ?? ""}` : this.formatAccountItemSearchText(item);
        return [
          accountItemText,
          row.name,
          row.tab,
          row.regex,
          row.viewRule,
          row.modifyRule,
        ].some(value => `${value ?? ""}`.toLowerCase().includes(searchText));
      });
  }

  renderToolbar(table: LegacyAny[], visibleCount: number): React.ReactNode {
    return (
      <div className="organization-account-table-toolbar">
        <div className="organization-config-table-toolbar">
          {this.props.title === undefined || this.props.title === null ? null : <span className="organization-config-table-title">{this.props.title}</span>}
          <Button type="primary" size="small" onClick={() => this.addRow(table)}>{i18next.t("organization:Add account item")}</Button>
        </div>
        <div className="organization-account-table-filters">
          <Input.Search
            allowClear
            className="organization-account-table-search"
            size="small"
            placeholder={i18next.t("organization:Search account item")}
            value={this.state.searchText}
            onChange={e => this.setState({searchText: e.target.value})}
          />
          <Checkbox checked={this.state.showEditableOnly} onChange={e => this.setState({showEditableOnly: e.target.checked})}>{i18next.t("organization:Editable only")}</Checkbox>
          <Checkbox checked={this.state.showHiddenOnly} onChange={e => this.setState({showHiddenOnly: e.target.checked})}>{i18next.t("organization:Hidden only")}</Checkbox>
          <Checkbox checked={this.state.showRegexOnly} onChange={e => this.setState({showRegexOnly: e.target.checked})}>{i18next.t("organization:With validation rule")}</Checkbox>
          <span className="organization-account-table-count">{i18next.t("organization:Showing account items", {count: visibleCount, total: table.length})}</span>
        </div>
      </div>
    );
  }

  renderTable(table: LegacyAny[] = []) {
    const dataSource = this.getFilteredRows(table);
    const columns: LegacyColumn[] = [
      {
        title: i18next.t("organization:Attribute"),
        dataIndex: "name",
        key: "name",
        width: 320,
        fixed: "left",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          return (
            <Select virtual={false} size="small" style={{width: "100%"}} optionLabelProp="label"
              options={this.getAccountItemOptions(table, rowIndex, text)}
              value={text}
              onChange={value => {
                this.updateField(table, rowIndex, "name", value);
              }} >
            </Select>
          );
        },
      },
      {
        title: i18next.t("organization:Visible"),
        dataIndex: "visible",
        key: "visible",
        width: "120px",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          return (
            <Switch size="small" checked={text} onChange={checked => {
              this.updateField(table, rowIndex, "visible", checked);
            }} />
          );
        },
      },
      {
        title: i18next.t("general:Tab"),
        dataIndex: "tab",
        key: "tab",
        width: "150px",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          const isEmpty = `${text ?? ""}`.trim() === "";
          return (
            <Input size="small" className={isEmpty ? "organization-account-table-quiet-input" : undefined} value={text ?? ""} placeholder={i18next.t("organization:Not set")} onChange={e => {
              this.updateField(table, rowIndex, "tab", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("signup:Regex"),
        dataIndex: "regex",
        key: "regex",
        width: "200px",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          const regexIncludeList = ["Display name", "Password", "Email", "Phone", "Location",
            "Title", "Homepage", "Bio", "Gender", "Birthday", "Education", "ID card",
            "ID card type"];
          if (!regexIncludeList.includes(record.name)) {
            return null;
          }

          const isEmpty = `${text ?? ""}`.trim() === "";
          return (
            <Input size="small" className={isEmpty ? "organization-account-table-quiet-input" : undefined} value={text ?? ""} placeholder={i18next.t("organization:Not set")} onChange={e => {
              this.updateField(table, rowIndex, "regex", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("organization:View rule"),
        dataIndex: "viewRule",
        key: "viewRule",
        width: "155px",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          if (!record.visible) {
            return null;
          }

          const options = [
            {id: "Public", name: i18next.t("organization:View rule Public")},
            {id: "Self", name: i18next.t("organization:View rule Self")},
            {id: "Admin", name: i18next.t("organization:View rule Admin")},
          ];

          return (
            <Select virtual={false} size="small" style={{width: "100%"}} optionLabelProp="label" value={text} onChange={(value => {
              this.updateField(table, rowIndex, "viewRule", value);
            })}
            options={options.map((item: LegacyAny) => Setting.getOption(item.name, item.id))}
            />
          );
        },
      },
      {
        title: i18next.t("organization:Modify rule"),
        dataIndex: "modifyRule",
        key: "modifyRule",
        width: "155px",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          if (!record.visible) {
            return null;
          }

          let options;
          if (record.viewRule === "Admin" || record.name === "Is admin") {
            options = [
              {id: "Admin", name: i18next.t("organization:Modify rule Admin")},
              {id: "Immutable", name: i18next.t("organization:Modify rule Immutable")},
            ];
          } else {
            options = [
              {id: "Self", name: i18next.t("organization:Modify rule Self")},
              {id: "Admin", name: i18next.t("organization:Modify rule Admin")},
              {id: "Immutable", name: i18next.t("organization:Modify rule Immutable")},
            ];
          }

          return (
            <Select virtual={false} size="small" style={{width: "100%"}} optionLabelProp="label" value={text} onChange={(value => {
              this.updateField(table, rowIndex, "modifyRule", value);
            })}
            options={options.map((item: LegacyAny) => Setting.getOption(item.name, item.id))}
            />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: "100px",
        fixed: "right",
        className: "organization-config-table-action-column",
        render: (text, record, index) => {
          const rowIndex = this.getRowIndex(record, index);
          return (
            <div className="organization-config-table-row-actions organization-config-table-row-actions-icons">
              <Tooltip placement="bottomLeft" title={i18next.t("general:Up")}>
                <Button aria-label={i18next.t("general:Up")} disabled={rowIndex === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, rowIndex)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={i18next.t("general:Down")}>
                <Button aria-label={i18next.t("general:Down")} disabled={rowIndex === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, rowIndex)} />
              </Tooltip>
              <Popconfirm
                title={i18next.t("organization:Remove account item confirmation")}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
                onConfirm={() => this.deleteRow(table, rowIndex)}
              >
                <Tooltip placement="topLeft" title={i18next.t("general:Delete")}>
                  <Button aria-label={i18next.t("general:Delete")} icon={<DeleteOutlined />} size="small" />
                </Tooltip>
              </Popconfirm>
            </div>
          );
        },
      },
    ];

    return (
      <Table tableLayout="fixed" scroll={{x: 1200, y: "calc(100vh - 380px)"}} rowKey="__accountItemIndex" columns={columns} dataSource={dataSource} size="small" bordered pagination={false}
        locale={{emptyText: i18next.t("organization:No account items matched")}}
        title={() => this.renderToolbar(table, dataSource.length)}
      />
    );
  }

  render() {
    return (
      <div className="organization-config-table-section account-table-section">
        {this.renderTable(this.props.table ?? [])}
      </div>
    );
  }
}

export default AccountTable;
