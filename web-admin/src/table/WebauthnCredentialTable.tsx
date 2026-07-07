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
import {Button, Table} from "antd";
import i18next from "i18next";
import * as UserWebauthnBackend from "../backend/UserWebauthnBackend";
import * as Setting from "../Setting";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

class WebAuthnCredentialTable extends React.Component<LegacyAny, LegacyAny> {
  deleteRow(table: LegacyAny, i: number) {
    table = Setting.deleteRow(table, i);
    this.props.updateTable(table);
  }

  registerWebAuthn() {
    UserWebauthnBackend.registerWebauthnCredential().then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", t("user:Successfully added WebAuthn credentials"));
      } else {
        Setting.showMessage("error", res.msg);
      }

      this.props.refresh();
    }).catch((error: LegacyAny) => {
      Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
    });
  }

  render() {
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "id",
        key: "id",
        ellipsis: true,
      },
      {
        title: t("general:Action"),
        key: "action",
        width: "170px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Button style={{marginTop: "5px", marginBottom: "5px", marginRight: "5px"}} type="primary" danger onClick={() => {this.deleteRow(this.props.table, index);}}>
              {t("general:Delete")}
            </Button>
          );
        },
      },
    ];

    const title = this.props.title === undefined ? t("user:WebAuthn credentials") : this.props.title;

    return (
      <Table rowKey={"id"} columns={columns} dataSource={this.props.table} size="middle" bordered pagination={false}
        title={() => (
          <div className="user-edit-table-toolbar">
            {title === null ? null : <span className="user-edit-table-title">{title}</span>}
            <div className="user-edit-table-toolbar-actions">
              <Button disabled={!this.props.isSelf} type="primary" size="small" onClick={() => {this.registerWebAuthn();}}>
                {t("general:Add")}
              </Button>
            </div>
          </div>
        )}
      />
    );
  }
}

export default WebAuthnCredentialTable;
