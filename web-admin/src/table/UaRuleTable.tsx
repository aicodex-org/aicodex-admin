// Copyright 2023 The casbin Authors. All Rights Reserved.
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
import {Button, Col, Input, Row, Select, Table, Tooltip} from "antd";
import type {TableProps} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import type {RuleExpressionRow, RuleExpressionTablePassthroughProps} from "./ruleExpressionRow";
import {getRuleExpressionText} from "./ruleExpressionRow";

const {Option} = Select;
const t = (key: string): string => String(i18next.t(key));

interface UaRuleTableProps extends RuleExpressionTablePassthroughProps {
  title: React.ReactNode;
  table: RuleExpressionRow[];
  onUpdateTable: (table: RuleExpressionRow[]) => void;
}

interface UaRuleTableState {
  classes: UaRuleTableProps;
  defaultRules: RuleExpressionRow[];
}

type RuleTableColumns = NonNullable<TableProps<RuleExpressionRow>["columns"]>;
type RuleExpressionField = keyof Pick<RuleExpressionRow, "name" | "operator" | "value">;

class UaRuleTable extends React.Component<UaRuleTableProps, UaRuleTableState> {
  constructor(props: UaRuleTableProps) {
    super(props);
    this.state = {
      classes: props,
      defaultRules: [
        {
          name: "Current User-Agent",
          operator: "equals",
          value: window.navigator.userAgent,
        },
      ],
    };
    if (this.props.table.length === 0) {
      this.restore();
    }
  }

  updateTable(table: RuleExpressionRow[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: RuleExpressionRow[], index: number, key: RuleExpressionField, value: string) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: RuleExpressionRow[] | undefined) {
    const row = {name: `New UA Rule - ${table!.length}`, operator: "equals", value: ""};
    if (table === undefined) {
      table = [];
    }

    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: RuleExpressionRow[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: RuleExpressionRow[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: RuleExpressionRow[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  restore() {
    this.updateTable(this.state.defaultRules);
  }

  renderTable(table: RuleExpressionRow[]) {
    const columns: RuleTableColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => (
          <Input value={getRuleExpressionText(text)} onChange={e => {
            this.updateField(table, index, "name", e.target.value);
          }} />
        ),
      },
      {
        title: t("rule:Operator"),
        dataIndex: "operator",
        key: "operator",
        width: "180px",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => (
          <Select value={getRuleExpressionText(text)} virtual={false} style={{width: "100%"}} onChange={(value: string) => {
            this.updateField(table, index, "operator", value);
          }}>
            {
              [
                {value: "equals", text: t("rule:equals")},
                {value: "does not equal", text: t("rule:does not equal")},
                {value: "contains", text: t("rule:contains")},
                {value: "does not contain", text: t("rule:does not contain")},
                {value: "match", text: t("rule:regex match")},
              ].map((item, index) => <Option key={index} value={item.value}>{item.text}</Option>)
            }
          </Select>
        ),
      },
      {
        title: t("rule:Value"),
        dataIndex: "value",
        key: "value",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => (
          <Input value={getRuleExpressionText(text)} onChange={e => {
            this.updateField(table, index, "value", e.target.value);
          }} onBlur={e => {
            this.updateField(table, index, "value", e.target.value.replace(/\s+/g, " ").trim());
          }} />
        ),
      },
      {
        title: t("general:Action"),
        key: "action",
        width: "100px",
        render: (_text: unknown, _record: RuleExpressionRow, index: number) => (
          <div>
            <Tooltip placement="bottomLeft" title={"Up"}>
              <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
            </Tooltip>
            <Tooltip placement="topLeft" title={"Down"}>
              <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
            </Tooltip>
            <Tooltip placement="topLeft" title={"Delete"}>
              <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
            </Tooltip>
          </div>
        ),
      },
    ];
    return (
      <Table rowKey="index" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.restore()}>{t("general:Restore")}</Button>
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

export default UaRuleTable;
