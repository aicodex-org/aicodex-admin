// Copyright 2025 The Casdoor Authors. All Rights Reserved.
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
import {Link} from "react-router-dom";
import {Button, Col, List, Row} from "antd";
import type {TableProps} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import i18next from "i18next";
import {legacyColumns} from "./types/legacyPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;
type LegacyColumn<TRecord = LegacyAny> = import("./types/legacyPage").LegacyColumn<TRecord>;
type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;
type LegacyListState<TRecord = LegacyAny> = import("./types/legacyPage").LegacyListState<TRecord>;

interface FormItemRecord {
  label: string;
  visible?: boolean;
  [key: string]: LegacyAny;
}

interface FormRecord {
  owner: string;
  name: string;
  createdTime?: string;
  displayName: string;
  type?: string;
  formItems: FormItemRecord[];
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

function getFormQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("general:Type"), value: "type"},
    {label: t("form:Form items"), value: "formItems"},
  ];
}

const FormBackendLegacy = FormBackend as LegacyAny;
const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyListState<FormRecord>> & LegacyAny;

class FormListPage extends LegacyBaseListPage {
  constructor(props: AdminRouteProps) {
    super(props);
  }

  newForm(): FormRecord {
    const randomName = Setting.getRandomName();
    return {
      owner: this.props.account.owner,
      name: `form_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Form - ${randomName}`,
      formItems: [],
    };
  }

  addForm() {
    const newForm = this.newForm();
    FormBackend.addForm(newForm)
      .then((res) => {
        if (res.status === "ok") {
          sessionStorage.setItem("formListUrl", window.location.pathname);
          this.props.history.push({
            pathname: `/forms/${newForm.name}`,
            mode: "add",
          });
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteForm(record: FormRecord) {
    FormBackend.deleteForm(record)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.setState({
            data: this.state.data.filter((item: FormRecord) => item.name !== record.name),
            pagination: {
              ...this.state.pagination,
              total: this.state.pagination.total - 1,
            },
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to delete")}: ${error}`);
      });
  }

  renderTable(forms: FormRecord[]) {
    const columns: LegacyColumn<FormRecord>[] = legacyColumns<FormRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "160px",
        sorter: (a: FormRecord, b: FormRecord) => a.name.localeCompare(b.name),
        render: (text: string, record: FormRecord, index: number) => {
          return (
            <Link to={`/forms/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "200px",
        sorter: (a: FormRecord, b: FormRecord) => a.displayName.localeCompare(b.displayName),
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "120px",
        sorter: (a: FormRecord, b: FormRecord) => a.type!.localeCompare(b.type!),
        render: (text: string, record: FormRecord, index: number) => {
          const typeOption = Setting.getFormTypeOptions().find(option => option.id === text);
          return typeOption ? t(typeOption.name) : text;
        },
      },
      {
        title: t("form:Form items"),
        dataIndex: "formItems",
        key: "formItems",
        render: (text: FormItemRecord[], record: FormRecord, index: number) => {
          const providers = text;
          if (!providers || providers.length === 0) {
            return `(${t("general:empty")})`;
          }

          const visibleProviders = providers.filter((item: FormItemRecord) => item.visible !== false);
          const leftItems: FormItemRecord[] = [];
          const rightItems: FormItemRecord[] = [];
          visibleProviders.forEach((item: FormItemRecord, idx: number) => {
            if (idx % 2 === 0) {
              leftItems.push(item);
            } else {
              rightItems.push(item);
            }
          });

          const getList = (items: FormItemRecord[]) => (
            <List<FormItemRecord>
              size="small"
              locale={{emptyText: " "}}
              dataSource={items}
              renderItem={providerItem => (
                <List.Item>
                  <div style={{display: "inline"}}>{t(providerItem.label)}</div>
                </List.Item>
              )}
            />
          );

          return (
            <div>
              <Row>
                <Col span={12}>{getList(leftItems)}</Col>
                <Col span={12}>{getList(rightItems)}</Col>
              </Row>
            </div>
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "112px",
        render: (text: LegacyAny, record: FormRecord, index: number) => {
          return (
            <ListPageRowActions className="form-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/forms/${record.name}`)} />
              <ListPageRowDeleteAction
                title={`${t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteForm(record)}
              />
            </ListPageRowActions>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell form-list-page-table-shell">
        <ListPageTable<FormRecord> columns={columns as TableProps<FormRecord>["columns"]} dataSource={forms}
          rowKey={(record) => `${record.owner}/${record.name}`}
          pagination={paginationProps}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:Forms")}
              total={this.state.pagination.total}
              fields={getFormQueryFields()}
              defaultField="name"
              actions={<Button type="primary" onClick={this.addForm.bind(this)}>{t("general:Add")}</Button>}
            />
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: LegacyFetchParams = {} as LegacyFetchParams) => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    FormBackendLegacy.getForms(this.props.account.owner, params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: LegacyAny) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          if (Setting.isResponseDenied(res)) {
            this.setState({
              isAuthorized: false,
            });
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      });
  };
}

export default FormListPage;
