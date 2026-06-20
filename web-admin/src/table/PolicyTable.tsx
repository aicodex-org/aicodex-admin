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
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import {Button, Input, Select, Table, Tooltip} from "antd";
import type {TableProps} from "antd";
import * as Setting from "../Setting";
import * as AdapterBackend from "../backend/AdapterBackend";
import i18next from "i18next";

type EnforcerRecord = {
  owner: string;
  name: string;
  model: string;
  adapter: string;
  [key: string]: unknown;
};

type PolicyRow = {
  key?: number;
  Ptype: string;
  V0?: string;
  V1?: string;
  V2?: string;
  V3?: string;
  V4?: string;
  V5?: string;
  [key: string]: unknown;
};

type PolicyTableProps = {
  enforcer: EnforcerRecord;
  modelCfg?: Record<string, string>;
  mode: string;
};

type PolicyTableState = {
  policyLists: PolicyRow[];
  loading: boolean;
  editingIndex: number | "";
  oldPolicy: PolicyRow | "";
  add: boolean;
  page: number;
};

type PolicyResponse = {
  status: string;
  msg?: string;
  data?: PolicyRow[] | string;
};

type AdapterBackendApi = {
  getPolicies: (owner: string, name: string) => Promise<PolicyResponse>;
  UpdatePolicy: (owner: string, name: string, policy: [PolicyRow, PolicyRow]) => Promise<PolicyResponse>;
  AddPolicy: (owner: string, name: string, policy: PolicyRow) => Promise<PolicyResponse>;
  RemovePolicy: (owner: string, name: string, policy: PolicyRow) => Promise<PolicyResponse>;
};

type PolicyColumn = {
  title: React.ReactNode;
  dataIndex?: string;
  key?: string;
  width?: string;
  render?: (text: unknown, record: PolicyRow, index: number) => React.ReactNode;
};

const adapterBackend = AdapterBackend as unknown as AdapterBackendApi;
const t = (key: string): string => i18next.t(key) as string;

class PolicyTable extends React.Component<PolicyTableProps, PolicyTableState> {
  constructor(props: PolicyTableProps) {
    super(props);
    this.state = {
      policyLists: [],
      loading: false,
      editingIndex: "",
      oldPolicy: "",
      add: false,
      page: 1,
    };
  }

  count = 0;
  pageSize = 100;

  getIndex(index: number): number {
    // AntD render 传入的是当前页可见索引，写回 policyLists 前要换算成真实数据索引。
    return index + (this.state.page - 1) * this.pageSize;
  }

  UNSAFE_componentWillMount(): void {
    if (this.props.mode === "edit" && this.props.enforcer.adapter !== "") {
      this.getPolicies();
    }
  }

  isEditing = (index: number): boolean => {
    return index === this.state.editingIndex;
  };

  edit = (record: PolicyRow, index: number): void => {
    this.setState({editingIndex: index, oldPolicy: Setting.deepCopy(record)});
  };

  cancel = (table: PolicyRow[], index: number): void => {
    const oldPolicy = this.state.oldPolicy as PolicyRow;
    Object.keys(table[this.getIndex(index)]).forEach((key) => {
      table[this.getIndex(index)][key] = oldPolicy[key];
    });
    this.updateTable(table);
    this.setState({editingIndex: "", oldPolicy: ""});
    if (this.state.add) {
      this.deleteRow(this.state.policyLists, index);
      this.setState({add: false});
    }
  };

  updateTable(table: PolicyRow[]): void {
    this.setState({policyLists: table});
  }

  updateField(table: PolicyRow[], index: number, key: string, value: string): void {
    table[this.getIndex(index)][key] = value;
    this.updateTable(table);
  }

  addRow(table?: PolicyRow[]): void {
    const row: PolicyRow = {key: this.count, Ptype: "p"};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row, "top");

    this.count = this.count + 1;
    this.updateTable(table);
    this.edit(row, 0);
    this.setState({
      page: 1,
      add: true,
    });
  }

  deleteRow(table: PolicyRow[], index: number): void {
    table = Setting.deleteRow(table, this.getIndex(index));
    this.updateTable(table);
  }

  save(table: PolicyRow[], i: number): void {
    this.state.add ? this.addPolicy(table, i) : this.updatePolicy(table, i);
  }

  getPolicies(): void {
    this.setState({loading: true});
    adapterBackend.getPolicies(this.props.enforcer.owner, this.props.enforcer.name)
      .then((res: PolicyResponse) => {
        if (res.status === "ok") {
          // Setting.showMessage("success", i18next.t("adapter:Sync policies successfully"));

          const policyList = (res.data || []) as PolicyRow[];
          policyList.map((policy, index) => {
            policy.key = index;
          });
          this.count = policyList.length;
          this.setState({policyLists: policyList});
        } else {
          Setting.showMessage("error", `${t("adapter:Failed to sync policies")}: ${res.msg}`);
        }
        this.setState({loading: false});
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  updatePolicy(table: PolicyRow[], i: number): void {
    adapterBackend.UpdatePolicy(this.props.enforcer.owner, this.props.enforcer.name, [this.state.oldPolicy as PolicyRow, table[i]]).then((res: PolicyResponse) => {
      if (res.status === "ok") {
        this.setState({editingIndex: "", oldPolicy: ""});
        Setting.showMessage("success", t("general:Successfully saved"));
      } else {
        Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
      }
    });
  }

  addPolicy(table: PolicyRow[], i: number): void {
    adapterBackend.AddPolicy(this.props.enforcer.owner, this.props.enforcer.name, table[i]).then((res: PolicyResponse) => {
      if (res.status === "ok") {
        this.setState({editingIndex: "", oldPolicy: "", add: false});
        if (res.data !== "Affected") {
          res.msg = t("adapter:Duplicated policy rules");
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        } else {
          Setting.showMessage("success", t("general:Successfully added"));
        }
      } else {
        Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
      }
    });
  }

  deletePolicy(table: PolicyRow[], index: number): void {
    adapterBackend.RemovePolicy(this.props.enforcer.owner, this.props.enforcer.name, table[this.getIndex(index)]).then((res: PolicyResponse) => {
      if (res.status === "ok") {
        Setting.showMessage("success", t("general:Successfully deleted"));

        this.deleteRow(table, index);
      } else {
        Setting.showMessage("error", t("general:Failed to delete"));
      }
    });
  }

  renderTable(table: PolicyRow[]): React.ReactElement | null {
    if (this.props.modelCfg === undefined) {
      return null;
    }

    const columns: PolicyColumn[] = [
      {
        title: t("adapter:Rule type"),
        dataIndex: "Ptype",
        width: "100px",
        render: (text: unknown, _record: PolicyRow, index: number) => {
          const editing = this.isEditing(index);
          const value = text === undefined || text === null ? "" : String(text);
          return (
            (editing && this.props.modelCfg) ?
              <Select size={"small"} style={{width: "60px"}} options={Object.keys(this.props.modelCfg).reverse().map(item => Setting.getOption(item, item))} value={value} onChange={nextValue => {
                this.updateField(table, index, "Ptype", nextValue);
              }} />
              : value
          );
        },
      },
    ];

    const columnKeys = ["V0", "V1", "V2", "V3", "V4", "V5"];
    const columnTitles = this.props.modelCfg ? this.props.modelCfg["p"].split(",") : columnKeys;
    columnTitles.forEach((title, i) => {
      columns.push({
        title: title,
        dataIndex: columnKeys[i],
        width: "200px",
        render: (text: unknown, _record: PolicyRow, index: number) => {
          const editing = this.isEditing(index);
          const value = text === undefined || text === null ? "" : String(text);
          return (
            editing ?
              <Input size={"small"} value={value} onChange={e => {
                this.updateField(table, index, columnKeys[i], e.target.value);
              }} />
              : value
          );
        },
      });
    });

    columns.push({
      title: t("general:Action"),
      dataIndex: "",
      key: "op",
      width: "150px",
      render: (_text: unknown, record: PolicyRow, index: number) => {
        const editable = this.isEditing(index);
        return editable ? (
          <span>
            <Button style={{marginRight: "10px"}} size={"small"} type={"primary"} onClick={() => this.save(table, index)}>
              {t("general:Save")}
            </Button>
            <Button size={"small"} onClick={() => this.cancel(table, index)}>
              {t("general:Cancel")}
            </Button>
          </span>
        ) : (
          <div>
            <Tooltip placement="topLeft" title="Edit">
              <Button disabled={this.state.editingIndex !== "" || Setting.builtInObject(this.props.enforcer)} style={{marginRight: "5px"}} icon={<EditOutlined />} size="small" onClick={() => this.edit(record, index)} />
            </Tooltip>
            <Tooltip placement="topLeft" title="Delete">
              <Button disabled={this.state.editingIndex !== "" || Setting.builtInObject(this.props.enforcer)} style={{marginRight: "5px"}} icon={<DeleteOutlined />} size="small" onClick={() => this.deletePolicy(table, index)} />
            </Tooltip>
          </div>
        );
      },
    });

    return (
      <Table<PolicyRow>
        pagination={{
          defaultPageSize: this.pageSize,
          onChange: (page) => this.setState({
            page: page,
          }),
          current: this.state.page,
        }}
        columns={columns as TableProps<PolicyRow>["columns"]} dataSource={table} rowKey="key" size="middle" bordered
        loading={this.state.loading}
        title={() => (
          <div>
            <Button disabled={this.state.editingIndex !== "" || this.props.enforcer.model === "" || this.props.enforcer.adapter === "" || Setting.builtInObject(this.props.enforcer)} style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render(): React.ReactElement {
    return (
      <React.Fragment>
        <Button disabled={this.state.editingIndex !== "" || this.props.enforcer.model === "" || this.props.enforcer.adapter === ""} style={{marginBottom: "10px", width: "150px"}} type="primary" onClick={() => {this.getPolicies();}}>
          {t("general:Sync")}
        </Button>
        {
          this.renderTable(this.state.policyLists)
        }
      </React.Fragment>
    );
  }
}

export default PolicyTable;
