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
import {DeleteOutlined, DownOutlined, LinkOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Col, Input, Row, Select, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18nextLib from "i18next";

const {Option} = Select;

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};

interface ManagedAccountTableProps {
  title?: React.ReactNode;
  table?: LegacyAny[] | null;
  applications?: LegacyAny[];
  embedded?: boolean;
  onUpdateTable: (table: LegacyAny[]) => void;
}

interface ManagedAccountTableState {
  classes: ManagedAccountTableProps;
  managedAccounts: LegacyAny[];
}

class ManagedAccountTable extends React.Component<ManagedAccountTableProps, ManagedAccountTableState> {
  constructor(props: ManagedAccountTableProps) {
    super(props);
    this.state = {
      classes: props,
      managedAccounts: this.props.table !== null && this.props.table !== undefined ? this.props.table.map((item, index) => {
        item.key = index;
        return item;
      }) : [],
    };
  }

  count = this.props.table?.length ?? 0;

  updateTable(table: LegacyAny[]) {
    this.setState({
      managedAccounts: table,
    });

    this.props.onUpdateTable([...table].map((item) => {
      const newItem = Setting.deepCopy(item);
      delete newItem.key;
      return newItem;
    }));
  }

  updateField(table: LegacyAny[], index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny[] | null | undefined) {
    const row = {key: this.count, application: "", username: "", password: ""};
    if (table === undefined || table === null) {
      table = [];
    }

    this.count += 1;
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

  renderTable(table: LegacyAny[] = []) {
    const columns: LegacyColumn[] = [
      {
        title: i18next.t("general:Application"),
        dataIndex: "application",
        key: "application",
        render: (text, record, index) => {
          const items = this.props.applications ?? [];
          return (
            <Select virtual={false} size="small" style={{width: "100%"}}
              value={text}
              onChange={value => {
                this.updateField(table, index, "application", value);
              }} >
              {
                items.map((item: LegacyAny, index: number) => <Option key={index} value={item.name}>{item.name}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: i18next.t("general:Signin URL"),
        dataIndex: "signinUrl",
        key: "signinUrl",
        // width: "420px",
        render: (text, record, index) => {
          return (
            <Input size="small" prefix={<LinkOutlined />} value={text} onChange={e => {
              this.updateField(table, index, "signinUrl", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("signup:Username"),
        dataIndex: "username",
        key: "username",
        width: "180px",
        render: (text, record, index) => {
          return (
            <Input size="small" value={text} onChange={e => {
              this.updateField(table, index, "username", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("general:Password"),
        dataIndex: "password",
        key: "password",
        width: "180px",
        render: (text, record, index) => {
          return (
            <Input.Password size="small" value={text} onChange={e => {
              this.updateField(table, index, "password", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: "100px",
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

    const title = this.props.title === undefined ? i18next.t("user:Managed accounts") : this.props.title;

    return (
      <Table className={this.props.embedded ? "user-edit-embedded-table" : undefined}
        scroll={{x: "max-content"}} rowKey="key" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        showHeader={!this.props.embedded || table.length > 0}
        locale={{emptyText: <span className="user-edit-table-empty-text">{i18next.t("general:No data")}</span>}}
        title={() => (
          <div className="user-edit-table-toolbar">
            {title === null ? null : <span className="user-edit-table-title">{title}</span>}
            <div className="user-edit-table-toolbar-actions">
              <Button type="primary" size="small" onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
            </div>
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
              this.renderTable(this.state.managedAccounts)
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default ManagedAccountTable;
