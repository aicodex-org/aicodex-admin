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
import {Button, Col, List, Row, Table, Tooltip} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as OrderBackend from "./backend/OrderBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import {EditOutlined} from "@ant-design/icons";
import type {AdminRouteProps, LegacyAny, LegacyListState} from "./types/legacyPage";
import type {OrderRecord} from "./types/businessPayment";

type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;
type OrderProductInfo = import("./types/businessPayment").OrderProductInfo;

const t = i18next.t.bind(i18next) as (key: string) => string;

interface OrderListState extends LegacyListState<OrderRecord> {}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, OrderListState> & LegacyAny;

// BaseListPage 仍是 legacy JS 类；订单列表只声明本页实际依赖的表格辅助能力。
interface OrderListPage {
  props: AdminRouteProps;
  state: OrderListState;
  getColumnSearchProps: (dataIndex: string, customRender?: LegacyAny) => LegacyAny;
  getTablePaginationProps: () => LegacyAny;
  handleTableChange: LegacyAny;
}

class OrderListPage extends LegacyBaseListPage {
  newOrder(): OrderRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `order_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Order - ${randomName}`,
      products: [],
      user: "",
      payment: "",
      state: "Created",
      message: "",
    };
  }

  addOrder() {
    const newOrder = this.newOrder();
    OrderBackend.addOrder(newOrder)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/orders/${newOrder.owner}/${newOrder.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  cancelOrder(order: OrderRecord) {
    OrderBackend.cancelOrder(order.owner, order.name)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully canceled"));
          this.fetch({
            pagination: this.state.pagination,
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to cancel")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteOrder(i: number) {
    OrderBackend.deleteOrder(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          const current = this.state.pagination.current || 1;
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: current > 1 && this.state.data.length === 1 ? current - 1 : current,
            },
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(orders?: OrderRecord[] | null) {
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "140px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: string, record: OrderRecord) => {
          return (
            <Link to={`/orders/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text: string) => {
          return (
            <Link to={`/organizations/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        sorter: true,
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Products"),
        dataIndex: "products",
        key: "products",
        ...this.getColumnSearchProps("products"),
        render: (text: LegacyAny, record: OrderRecord) => {
          const productInfos = record?.productInfos || [];
          if (productInfos.length === 0) {
            return `(${t("general:empty")})`;
          }
          return (
            <div>
              <List
                size="small"
                locale={{emptyText: " "}}
                dataSource={productInfos}
                style={{
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
                renderItem={(productInfo: OrderProductInfo) => {
                  const price = productInfo.price || 0;
                  const number = productInfo.quantity || 1;
                  const currency = record.currency || "USD";
                  const productName = productInfo.displayName || productInfo.name;
                  return (
                    <List.Item>
                      <Row style={{width: "100%"}} wrap={false} gutter={[12, 0]}>
                        <Col flex="auto" style={{minWidth: 0}}>
                          <div style={{display: "flex", alignItems: "center", minWidth: 0}}>
                            <Tooltip placement="topLeft" title={t("general:Edit")}>
                              <Button style={{marginRight: "5px"}} icon={<EditOutlined />} size="small" onClick={() => Setting.goToLinkSoft(this, `/products/${record.owner}/${productInfo.name}`)} />
                            </Tooltip>
                            <Tooltip placement="topLeft" title={productName}>
                              <Link to={`/products/${record.owner}/${productInfo.name}`} style={{display: "inline-block", maxWidth: "100%", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                                {productName}
                              </Link>
                            </Tooltip>
                          </div>
                        </Col>
                        <Col flex="none" style={{whiteSpace: "nowrap"}}>
                          <span style={{color: "#666"}}>
                            {Setting.getCurrencySymbol(currency)}{price} ({Setting.getCurrencyText(currency)}) × {number}
                          </span>
                        </Col>
                      </Row>
                    </List.Item>
                  );
                }}
              />
            </div>
          );
        },
      },
      {
        title: t("order:Price"),
        dataIndex: "price",
        key: "price",
        width: "160px",
        sorter: true,
        ...this.getColumnSearchProps("price"),
        render: (text: LegacyAny, record: OrderRecord) => {
          const price = (record.price || 0).toFixed(2);
          const currency = record.currency || "USD";
          const priceDisplay = Setting.getPriceDisplay(price, currency);

          return record.payment ? (
            <Link to={`/payments/${record.owner}/${record.payment}`}>
              {priceDisplay}
            </Link>
          ) : (
            <span>{priceDisplay}</span>
          );
        },
      },
      {
        title: t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("user"),
        render: (text: string, record: OrderRecord) => {
          if (text === "") {
            return "(empty)";
          }
          return (
            <Link to={`/users/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
        render: (text: string, record: OrderRecord) => {
          return (
            <Tooltip title={record.message || ""}>
              <span>{text}</span>
            </Tooltip>
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "320px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text: LegacyAny, record: OrderRecord, index: number) => {
          const isAdmin = Setting.isLocalAdminUser(this.props.account);
          return (
            <div style={{display: "flex", flexWrap: "wrap", gap: "8px"}}>
              <Button onClick={() => this.props.history.push(`/orders/${record.owner}/${record.name}/pay`)}>
                {(record.state === "Created" || record.state === "Failed") ? t("order:Pay") : t("general:Detail")}
              </Button>
              <Button danger onClick={() => this.cancelOrder(record)} disabled={record.state !== "Created" || !isAdmin}>
                {t("general:Cancel")}
              </Button>
              <Button type="primary" onClick={() => this.props.history.push({pathname: `/orders/${record.owner}/${record.name}`, mode: isAdmin ? "edit" : "view"})}>{isAdmin ? t("general:Edit") : t("general:View")}</Button>
              {isAdmin && (
                <PopconfirmModal
                  title={t("general:Sure to delete") + `: ${record.name} ?`}
                  onConfirm={() => this.deleteOrder(index)}
                >
                </PopconfirmModal>
              )}
            </div>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns as LegacyAny} dataSource={orders || []} rowKey={(record: OrderRecord) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => {
            const isAdmin = Setting.isLocalAdminUser(this.props.account);
            return (
              <div>
                {t("general:Orders")}&nbsp;&nbsp;&nbsp;&nbsp;
                <Button type="primary" size="small" disabled={!isAdmin} onClick={this.addOrder.bind(this)}>{t("general:Add")}</Button>
              </div>
            );
          }}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: LegacyFetchParams) => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    OrderBackend.getOrders(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current as LegacyAny, params.pagination.pageSize as LegacyAny, field, value, sortField, sortOrder)
      .then((res) => {
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

export default OrderListPage;
