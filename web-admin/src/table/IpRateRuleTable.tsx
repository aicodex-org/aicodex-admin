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
import {Button, Col, Input, InputNumber, Row, Table} from "antd";
import type {TableProps} from "antd";
import i18next from "i18next";
import type {RuleExpressionRow, RuleExpressionTablePassthroughProps} from "./ruleExpressionRow";
import {getRuleExpressionText} from "./ruleExpressionRow";

const t = (key: string): string => String(i18next.t(key));

interface IpRateRuleTableProps extends RuleExpressionTablePassthroughProps {
  title: React.ReactNode;
  table: RuleExpressionRow[];
  onUpdateTable: (table: RuleExpressionRow[]) => void;
}

interface IpRateRuleTableState {
  classes: IpRateRuleTableProps;
  defaultRules: RuleExpressionRow[];
}

type NumericInputValue = string | number | null;
type RuleTableColumns = NonNullable<TableProps<RuleExpressionRow>["columns"]>;
type RuleExpressionField = keyof Pick<RuleExpressionRow, "name" | "operator" | "value">;

class IpRateRuleTable extends React.Component<IpRateRuleTableProps, IpRateRuleTableState> {
  constructor(props: IpRateRuleTableProps) {
    super(props);
    this.state = {
      classes: props,
      defaultRules: [
        {
          name: "Default IP Rate",
          operator: "100",
          value: "6000",
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

  updateField(table: RuleExpressionRow[], index: number, key: RuleExpressionField, value: NumericInputValue) {
    table[index][key] = String(value);
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
        width: "20%",
        render: (_text: unknown, record: RuleExpressionRow, index: number) => (
          <Input value={getRuleExpressionText(record.name)} onChange={e => {
            this.updateField(table, index, "name", e.target.value);
          }} />
        ),
      },
      {
        title: t("rule:Rate"),
        dataIndex: "operator",
        key: "operator",
        width: "40%",
        render: (_text: unknown, record: RuleExpressionRow, index: number) => (
          <InputNumber style={{"width": "100%"}} value={Number(getRuleExpressionText(record.operator))} addonAfter="requests / ip / s" onChange={value => {
            this.updateField(table, index, "operator", value);
          }} />
        ),
      },
      {
        title: t("rule:Block Duration"),
        dataIndex: "value",
        key: "value",
        width: "100%",
        render: (_text: unknown, record: RuleExpressionRow, index: number) => (
          <InputNumber style={{"width": "100%"}} value={Number(getRuleExpressionText(record.value))} addonAfter={t("usage:seconds")} onChange={value => {
            this.updateField(table, index, "value", value);
          }} />
        ),
      },
    ];

    return (
      <Table rowKey="index" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
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

export default IpRateRuleTable;
