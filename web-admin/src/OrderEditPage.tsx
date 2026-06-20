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
import {Button, Card, Col, Input, Row, Select} from "antd";
import PaginateSelect from "./common/PaginateSelect";
import * as OrderBackend from "./backend/OrderBackend";
import * as ProductBackend from "./backend/ProductBackend";
import * as UserBackend from "./backend/UserBackend";
import * as PaymentBackend from "./backend/PaymentBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import type {AdminRouteProps, LegacyAny} from "./types/legacyPage";
import type {OrderRecord, PaymentProductRecord, PaymentRecord} from "./types/businessPayment";

const {Option} = Select;

const t = i18next.t.bind(i18next) as (key: string) => string;

interface OrderEditProps extends AdminRouteProps {
  organizationName?: string;
  match: {
    params: {
      organizationName: string;
      orderName: string;
      [key: string]: LegacyAny;
    };
    [key: string]: LegacyAny;
  };
  location: {
    mode?: string;
    [key: string]: LegacyAny;
  };
}

interface OrderEditState {
  classes: OrderEditProps;
  organizationName: string;
  orderName: string;
  order: OrderRecord | null;
  products: PaymentProductRecord[];
  users: LegacyAny[];
  payments: PaymentRecord[];
  mode: string;
}

class OrderEditPage extends React.Component<OrderEditProps, OrderEditState> {
  constructor(props: OrderEditProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      orderName: props.match.params.orderName,
      order: null,
      products: [],
      users: [],
      payments: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount() {
    this.getOrder();
    this.getProducts();
    this.getPayments();
  }

  getOrder() {
    OrderBackend.getOrder(this.state.organizationName, this.state.orderName)
      .then((res) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        this.setState({
          order: res.data,
        });
      });
  }

  getProducts() {
    ProductBackend.getProducts(this.state.organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            products: res.data,
          });
        } else {
          Setting.showMessage("error", `Failed to get products: ${res.msg}`);
        }
      });
  }

  getPayments() {
    PaymentBackend.getPayments(this.state.organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            payments: res.data,
          });
        } else {
          Setting.showMessage("error", `Failed to get payments: ${res.msg}`);
        }
      });
  }

  parseOrderField(key: string, value: LegacyAny) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateOrderField(key: string, value: LegacyAny) {
    value = this.parseOrderField(key, value);

    const order = this.state.order;
    if (order === null) {
      return;
    }
    order[key] = value;
    this.setState({
      order: order,
    });
  }

  renderOrder() {
    const isViewMode = this.state.mode === "view";
    const order = this.state.order;
    if (order === null) {
      return null;
    }
    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("order:New Order") : (isViewMode ? t("order:View Order") : t("order:Edit Order"))}&nbsp;&nbsp;&nbsp;&nbsp;
          {!isViewMode && (<>
            <Button onClick={() => this.submitOrderEdit(false)}>{t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitOrderEdit(true)}>{t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteOrder()}>{t("general:Cancel")}</Button> : null}
          </>)}
        </div>
      } style={{marginLeft: "5px"}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Organization")}:
          </Col>
          <Col span={22} >
            <Input value={order.owner} disabled />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Name")}:
          </Col>
          <Col span={22} >
            <Input value={order.name} disabled={isViewMode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              this.updateOrderField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Display name")}:
          </Col>
          <Col span={22} >
            <Input value={order.displayName} disabled={isViewMode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              this.updateOrderField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Products")}:
          </Col>
          <Col span={22} >
            <Select
              mode="multiple"
              style={{width: "100%"}}
              value={order.products || []}
              disabled={isViewMode}
              allowClear
              options={(this.state.products || [])
                .map((p: PaymentProductRecord) => ({
                  label: Setting.getLanguageText(p?.displayName) || p?.name,
                  value: p?.name,
                }))
                .filter((o) => o.value)}
              onChange={(value) => {
                this.updateOrderField("products", value);
              }}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:User")}:
          </Col>
          <Col span={22} >
            <PaginateSelect
              virtual
              style={{width: "100%"}}
              value={order.user}
              disabled={isViewMode}
              allowClear
              fetchPage={UserBackend.getUsers}
              buildFetchArgs={({page, pageSize, searchText}: {page: number; pageSize: number; searchText?: string}) => {
                const field = searchText ? "name" : "";
                return [this.state.organizationName, page, pageSize, field, searchText];
              }}
              reloadKey={this.state.organizationName}
              optionMapper={(user: LegacyAny) => Setting.getOption(user.name, user.name)}
              filterOption={false}
              onChange={(value: string) => {
                this.updateOrderField("user", value || "");
              }}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Payment")}:
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={order.payment} disabled={isViewMode} onChange={(value) => {
              this.updateOrderField("payment", value);
            }}>
              <Option value="">{"(empty)"}</Option>
              {
                this.state.payments?.map((payment: PaymentRecord, index: number) => <Option key={index} value={payment.name}>{payment.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:State")}:
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={order.state} disabled={isViewMode} onChange={(value) => {
              this.updateOrderField("state", value);
            }}>
              {
                [
                  {id: "Created", name: "Created"},
                  {id: "Paid", name: "Paid"},
                  {id: "Delivered", name: "Delivered"},
                  {id: "Completed", name: "Completed"},
                  {id: "Canceled", name: "Canceled"},
                  {id: "Expired", name: "Expired"},
                ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("payment:Message")}:
          </Col>
          <Col span={22} >
            <Input value={order.message} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              this.updateOrderField("message", e.target.value);
            }} />
          </Col>
        </Row>
      </Card>
    );
  }

  submitOrderEdit(exitAfterSave: boolean) {
    const order = Setting.deepCopy(this.state.order);
    if (order === null) {
      return;
    }
    OrderBackend.updateOrder(this.state.organizationName, this.state.orderName, order)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            orderName: order.name,
          });
          if (exitAfterSave) {
            this.props.history.push("/orders");
          } else {
            this.props.history.push(`/orders/${order.owner}/${order.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteOrder() {
    if (this.state.order === null) {
      return;
    }
    OrderBackend.deleteOrder(this.state.order)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push("/orders");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div>
        {
          this.state.order !== null ? this.renderOrder() : null
        }
        {this.state.mode !== "view" && (
          <div style={{marginTop: "20px", marginLeft: "40px"}}>
            <Button size="large" onClick={() => this.submitOrderEdit(false)}>{t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitOrderEdit(true)}>{t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteOrder()}>{t("general:Cancel")}</Button> : null}
          </div>
        )}
      </div>
    );
  }
}

export default OrderEditPage;
