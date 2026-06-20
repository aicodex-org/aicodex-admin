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
import {Link} from "react-router-dom";
import {Button, Col, List, Row, Table, Tooltip} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as PaymentBackend from "./backend/PaymentBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import * as Provider from "./auth/Provider";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import {EditOutlined} from "@ant-design/icons";
import type {AdminRouteProps, LegacyAny, LegacyListState} from "./types/legacyPage";
import type {PaymentRecord} from "./types/businessPayment";

type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;
type OrderProductInfo = import("./types/businessPayment").OrderProductInfo;

const t = i18next.t.bind(i18next) as (key: string) => string;

interface PaymentListState extends LegacyListState<PaymentRecord> {}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, PaymentListState> & LegacyAny;

// BaseListPage 仍是 legacy JS 类；付款列表只声明本页实际使用的表格辅助能力。
interface PaymentListPage {
  props: AdminRouteProps;
  state: PaymentListState;
  getColumnSearchProps: (dataIndex: string, customRender?: LegacyAny) => LegacyAny;
  getTablePaginationProps: () => LegacyAny;
  handleTableChange: LegacyAny;
}

class PaymentListPage extends LegacyBaseListPage {
  newPayment(): PaymentRecord {
    const randomName = Setting.getRandomName();
    const organizationName = Setting.getRequestOrganization(this.props.account);
    return {
      owner: organizationName,
      name: `payment_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Payment - ${randomName}`,
      provider: "provider_pay_paypal",
      type: "PayPal",
      user: "admin",
      products: [],
      productsDisplayName: "",
      detail: "This is a payment",
      tag: "Promotion-1",
      currency: "USD",
      price: 300.00,
      payUrl: "https://pay.com/pay.php",
      state: "Paid",
      message: "",
    };
  }

  addPayment() {
    const newPayment = this.newPayment();
    PaymentBackend.addPayment(newPayment)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/payments/${newPayment.owner}/${newPayment.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      }
      )
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deletePayment(i: number) {
    PaymentBackend.deletePayment(this.state.data[i])
      .then((res: LegacyAny) => {
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

  renderTable(payments?: PaymentRecord[] | null) {
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: string, record: PaymentRecord) => {
          return (
            <Link to={`/payments/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "120px",
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
        title: t("general:Provider"),
        dataIndex: "provider",
        key: "provider",
        width: "150px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("provider"),
        render: (text: string, record: PaymentRecord) => {
          return (
            <Link to={`/providers/${record.owner}/${text}`}>
              {text}
            </Link>
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
        render: (text: string, record: PaymentRecord) => {
          return (
            <Link to={`/users/${record.owner}/${text}`}>
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
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "140px",
        align: "center",
        filterMultiple: false,
        filters: Setting.getProviderTypeOptions("Payment").map((o) => {return {text: o.id, value: o.name};}),
        sorter: true,
        render: (text: string, record: PaymentRecord) => {
          record.category = "Payment";
          return Provider.getProviderLogoWidget(record);
        },
      },
      {
        title: t("general:Products"),
        dataIndex: "products",
        key: "products",
        ...this.getColumnSearchProps("products"),
        render: (text: LegacyAny, record: PaymentRecord) => {
          const productInfos = record?.orderObj?.productInfos || [];
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
        render: (text: LegacyAny, record: PaymentRecord) => {
          return Setting.getPriceDisplay(record.price, record.currency);
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "240px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text: LegacyAny, record: PaymentRecord, index: number) => {
          const isAdmin = Setting.isLocalAdminUser(this.props.account);
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/payments/${record.owner}/${record.name}/result`)}>{t("payment:Result")}</Button>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push({pathname: `/payments/${record.owner}/${record.name}`, mode: isAdmin ? "edit" : "view"})}>{isAdmin ? t("general:Edit") : t("general:View")}</Button>
              <PopconfirmModal
                disabled={!isAdmin}
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deletePayment(index)}
              >
              </PopconfirmModal>
            </div>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns as LegacyAny} dataSource={payments || []} rowKey={(record: PaymentRecord) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => {
            const isAdmin = Setting.isLocalAdminUser(this.props.account);
            return (
              <div>
                {t("general:Payments")}&nbsp;&nbsp;&nbsp;&nbsp;
                <Button type="primary" size="small" disabled={!isAdmin} onClick={this.addPayment.bind(this)}>{t("general:Add")}</Button>
              </div>
            );
          }}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: Partial<LegacyFetchParams> & Record<string, LegacyAny> = {}) => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    (PaymentBackend.getPayments as LegacyAny)(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination?.current, params.pagination?.pageSize, field, value, sortField, sortOrder)
      .then((res: LegacyAny) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...(params.pagination || {}),
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

export default PaymentListPage;
