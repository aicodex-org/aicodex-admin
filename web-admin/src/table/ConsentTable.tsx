// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
import {Button, Popconfirm, Table, Tag} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import * as ConsentBackend from "../backend/ConsentBackend";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

class ConsentTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  deleteScope(record: LegacyAny, scopeToDelete?: LegacyAny) {
    ConsentBackend.revokeConsent({
      application: record.application,
      grantedScopes: scopeToDelete ? [scopeToDelete] : record.grantedScopes,
    })
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully revoked"));
          this.props.onUpdateTable();
        } else {
          Setting.showMessage("error", res.msg);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(table: LegacyAny) {
    const columns = [
      {
        title: t("general:Application"),
        dataIndex: "application",
        key: "application",
        width: "200px",
        render: (text: LegacyAny) => {
          return text;
        },
      },
      {
        title: t("consent:Granted scopes"),
        dataIndex: "grantedScopes",
        key: "grantedScopes",
        render: (text: LegacyAny, record: LegacyAny) => {
          return (
            <div style={{display: "flex", flexWrap: "wrap", gap: "4px"}}>
              {
                (Array.isArray(text) ? text : []).map((scope: LegacyAny, index: number) => {
                  return (
                    <Popconfirm
                      key={index}
                      title={`${t("consent:Are you sure you want to revoke scope")}: ${scope}?`}
                      onConfirm={() => this.deleteScope(record, scope)}
                      okText={t("general:OK")}
                      cancelText={t("general:Cancel")}
                    >
                      <Tag
                        color="blue"
                        style={{cursor: "pointer"}}
                      >
                        {scope}
                      </Tag>
                    </Popconfirm>
                  );
                })
              }
            </div>
          );
        },
      },
      {
        title: t("general:Action"),
        key: "action",
        width: "100px",
        render: (_: LegacyAny, record: LegacyAny, __: number) => {
          return (
            <Popconfirm
              title={t("consent:Are you sure you want to revoke this consent?")}
              onConfirm={() => this.deleteScope(record)}
              okText={t("general:OK")}
              cancelText={t("general:Cancel")}
            >
              <Button type="primary" danger size="small">
                {t("consent:Delete")}
              </Button>
            </Popconfirm>
          );
        },
      },
    ];

    const title = this.props.title === undefined ? t("consent:Consents") : this.props.title;

    return (
      <Table scroll={{x: "max-content"}} rowKey="application" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={title === null ? undefined : () => (
          <div className="user-edit-table-toolbar">
            <span className="user-edit-table-title">{title}</span>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        {
          this.renderTable(this.props.table)
        }
      </div>
    );
  }
}

export default ConsentTable;
