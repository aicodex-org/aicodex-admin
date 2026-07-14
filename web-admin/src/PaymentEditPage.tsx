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
import {Button, Card, Col, Descriptions, Input, Modal, Row, Select} from "antd";
import {InfoCircleTwoTone} from "@ant-design/icons";
import * as PaymentBackend from "./backend/PaymentBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import type {AdminRouteProps, LegacyAny} from "./types/legacyPage";
import type {PaymentRecord} from "./types/businessPayment";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";

const {Option} = Select;

const t = i18next.t.bind(i18next) as (key: string) => string;

interface PaymentEditProps extends AdminRouteProps {
  organizationName?: string;
  match: {
    params: {
      organizationName: string;
      paymentName: string;
      [key: string]: LegacyAny;
    };
    [key: string]: LegacyAny;
  };
  location: {
    mode?: string;
    [key: string]: LegacyAny;
  };
}

interface PaymentEditState {
  classes: PaymentEditProps;
  organizationName: string;
  paymentName: string;
  payment: PaymentRecord | null;
  isModalVisible: boolean;
  isInvoiceLoading: boolean;
  mode: string;
}

class PaymentEditPage extends React.Component<PaymentEditProps, PaymentEditState> {
  constructor(props: PaymentEditProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      paymentName: props.match.params.paymentName,
      payment: null,
      isModalVisible: false,
      isInvoiceLoading: false,
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount() {
    this.getPayment();
  }

  getPayment() {
    PaymentBackend.getPayment(this.state.organizationName, this.state.paymentName)
      .then((res) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        this.setState({
          payment: res.data,
        }, () => this.publishWorkspaceTabLabel(res.data));

        Setting.scrollToDiv("invoice-area");
      });
  }

  goToViewOrder() {
    const payment = this.state.payment;
    if (payment && payment.order) {
      this.props.history.push(`/orders/${payment.owner}/${payment.order}/pay`);
    } else {
      Setting.showMessage("error", t("order:Order not found"));
    }
  }

  goToOrderList() {
    this.props.history.push("/orders");
  }

  parsePaymentField(key: string, value: LegacyAny) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updatePaymentField(key: string, value: LegacyAny) {
    value = this.parsePaymentField(key, value);

    const payment = this.state.payment;
    if (payment === null) {
      return;
    }
    payment[key] = value;
    this.setState({
      payment: payment,
    }, () => {
      if (key === "displayName" && this.state.mode !== "view") {
        this.publishWorkspaceTabLabel(payment);
      }
    });
  }

  getCurrentWorkspaceTabPath(): string {
    return `/payments/${this.state.organizationName}/${this.state.paymentName}`;
  }

  getPaymentWorkspaceTabLabel(payment: PaymentRecord): string {
    const displayName = typeof payment.displayName === "string" ? payment.displayName.trim() : "";
    const objectName = displayName || `${payment.name || this.state.paymentName}`.trim();
    const editLabel = t("payment:Edit Payment");
    const separator = /[\u3400-\u9fff]/.test(editLabel) ? "：" : ": ";

    return `${editLabel}${separator}${objectName}`;
  }

  // 支付详情加载后更新工作页标签；只读模式中的字段调用不发布编辑态标题。
  publishWorkspaceTabLabel(payment: PaymentRecord): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getPaymentWorkspaceTabLabel(payment),
      },
    }));
  }

  issueInvoice() {
    if (this.state.payment === null) {
      return;
    }
    this.setState({
      isModalVisible: false,
      isInvoiceLoading: true,
    });

    PaymentBackend.invoicePayment(this.state.payment.owner, this.state.paymentName)
      .then((res) => {
        this.setState({
          isInvoiceLoading: false,
        });
        if (res.status === "ok") {
          Setting.showMessage("success", "Successfully invoiced");
          Setting.openLinkSafe(res.data);
          this.getPayment();
        } else {
          Setting.showMessage(res.msg.includes("成功") ? "info" : "error", res.msg);
        }
      })
      .catch(error => {
        this.setState({
          isInvoiceLoading: false,
        });
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  downloadInvoice(_force?: boolean) {
    if (this.state.payment === null) {
      return;
    }
    Setting.openLinkSafe(this.state.payment.invoiceUrl);
  }

  renderModal() {
    const ths = this;
    const handleIssueInvoice = () => {
      ths.issueInvoice();
    };

    const handleCancel = () => {
      this.setState({
        isModalVisible: false,
      });
    };

    return (
      <Modal title={
        <div>
          <InfoCircleTwoTone twoToneColor="rgb(45,120,213)" />
          {" " + t("payment:Confirm your invoice information")}
        </div>
      }
      open={this.state.isModalVisible}
      onOk={handleIssueInvoice}
      onCancel={handleCancel}
      okText={t("payment:Issue Invoice")}
      cancelText={t("general:Cancel")}>
        <p>
          {
            t("payment:Please carefully check your invoice information. Once the invoice is issued, it cannot be withdrawn or modified.")
          }
          <br />
          <br />
          <Descriptions size={"small"} bordered>
            <Descriptions.Item label={t("payment:Person name")} span={3}>{this.state.payment?.personName}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Person ID card")} span={3}>{this.state.payment?.personIdCard}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Person Email")} span={3}>{this.state.payment?.personEmail}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Person phone")} span={3}>{this.state.payment?.personPhone}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Invoice type")} span={3}>{this.state.payment?.invoiceType === "Individual" ? t("payment:Individual") : t("general:Organization")}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Invoice title")} span={3}>{this.state.payment?.invoiceTitle}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Invoice tax ID")} span={3}>{this.state.payment?.invoiceTaxId}</Descriptions.Item>
            <Descriptions.Item label={t("payment:Invoice remark")} span={3}>{this.state.payment?.invoiceRemark}</Descriptions.Item>
          </Descriptions>
        </p>
      </Modal>
    );
  }

  renderPayment() {
    const isViewMode = this.state.mode === "view";
    const payment = this.state.payment;
    if (payment === null) {
      return null;
    }
    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("payment:New Payment") : (isViewMode ? t("payment:View Payment") : t("payment:Edit Payment"))}&nbsp;&nbsp;&nbsp;&nbsp;
          {!isViewMode && (<>
            <Button onClick={() => this.submitPaymentEdit(false)}>{t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitPaymentEdit(true)}>{t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deletePayment()}>{t("general:Cancel")}</Button> : null}
          </>)}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.owner} onChange={e => {
              // this.updatePaymentField('organization', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.name} onChange={e => {
              // this.updatePaymentField('name', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.displayName} onChange={e => {
              this.updatePaymentField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Provider"), t("general:Provider - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.provider} onChange={e => {
              // this.updatePaymentField('provider', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Type"), t("general:Type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.type} onChange={e => {
              // this.updatePaymentField('type', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("order:Price"), t("plan:Price - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.price} onChange={e => {
              // this.updatePaymentField('amount', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Currency"), t("payment:Currency - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={payment.currency} disabled={true} onChange={(value => {
              // this.updatePaymentField('currency', e.target.value);
            })}>
              {
                Setting.CurrencyOptions.map((item, index) => <Option key={index} value={item.id}>{Setting.getCurrencyWithFlag(item.id)}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:State"), t("general:State - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.state} onChange={e => {
              // this.updatePaymentField('state', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Message"), t("payment:Message - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.message} onChange={e => {
              // this.updatePaymentField('message', e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Person name"), t("payment:Person name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== ""} value={payment.personName} onChange={e => {
              this.updatePaymentField("personName", e.target.value);
              if (payment.invoiceType === "Individual") {
                this.updatePaymentField("invoiceTitle", e.target.value);
                this.updatePaymentField("invoiceTaxId", "");
              }
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Person ID card"), t("payment:Person ID card - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== ""} value={payment.personIdCard} onChange={e => {
              this.updatePaymentField("personIdCard", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Person Email"), t("payment:Person Email - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== ""} value={payment.personEmail} onChange={e => {
              this.updatePaymentField("personEmail", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Person phone"), t("payment:Person phone - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== ""} value={payment.personPhone} onChange={e => {
              this.updatePaymentField("personPhone", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Invoice type"), t("payment:Invoice type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} disabled={isViewMode || payment.invoiceUrl !== ""} style={{width: "100%"}} value={payment.invoiceType} onChange={(value => {
              this.updatePaymentField("invoiceType", value);
              if (value === "Individual") {
                this.updatePaymentField("invoiceTitle", payment.personName);
                this.updatePaymentField("invoiceTaxId", "");
              }
            })}>
              {
                [
                  {id: "Individual", name: t("payment:Individual")},
                  {id: "Organization", name: t("general:Organization")},
                ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Invoice title"), t("payment:Invoice title - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== "" || payment.invoiceType === "Individual"} value={payment.invoiceTitle} onChange={e => {
              this.updatePaymentField("invoiceTitle", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Invoice tax ID"), t("payment:Invoice tax ID - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== "" || payment.invoiceType === "Individual"} value={payment.invoiceTaxId} onChange={e => {
              this.updatePaymentField("invoiceTaxId", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Invoice remark"), t("payment:Invoice remark - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={isViewMode || payment.invoiceUrl !== ""} value={payment.invoiceRemark} onChange={e => {
              this.updatePaymentField("invoiceRemark", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Invoice URL"), t("payment:Invoice URL - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={payment.invoiceUrl} onChange={e => {
              this.updatePaymentField("invoiceUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row id={"invoice-area"} style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Invoice actions"), t("payment:Invoice actions - Tooltip"))} :
          </Col>
          <Col span={22} >
            {
              payment.invoiceUrl === "" ? (
                <Button type={"primary"} loading={this.state.isInvoiceLoading} onClick={() => {
                  const errorText = this.checkError();
                  if (errorText !== "") {
                    Setting.showMessage("error", errorText);
                    return;
                  }

                  this.setState({
                    isModalVisible: true,
                  });
                }}>{t("payment:Issue Invoice")}</Button>
              ) : (
                <Button type={"primary"} onClick={() => this.downloadInvoice(false)}>{t("payment:Download Invoice")}</Button>
              )
            }
            <Button style={{marginLeft: "10px"}} onClick={() => this.goToViewOrder()}>{t("order:View Order")}</Button>
            <Button style={{marginLeft: "10px"}} onClick={() => this.goToOrderList()}>{t("order:Return to Order List")}</Button>
          </Col>
        </Row>
      </Card>
    );
  }

  checkError() {
    const payment = this.state.payment;
    if (payment === null) {
      return "";
    }

    if (payment.state !== "Paid") {
      return t("payment:Please pay the order first!");
    }

    if (!Setting.isValidPersonName(payment.personName)) {
      return t("signup:Please input your real name!");
    }

    if (!Setting.isValidIdCard(payment.personIdCard)) {
      return t("signup:Please input the correct ID card number!");
    }

    if (!Setting.isValidEmail(payment.personEmail)) {
      return t("login:The input is not valid Email!");
    }

    if (!Setting.isValidPhone(payment.personPhone)) {
      return t("signup:The input is not valid Phone!");
    }

    if (!Setting.isValidPhone(payment.personPhone)) {
      return t("signup:The input is not valid Phone!");
    }

    if (payment.invoiceType === "Individual") {
      if (payment.invoiceTitle !== payment.personName) {
        return t("signup:The input is not invoice title!");
      }

      if (payment.invoiceTaxId !== "") {
        return t("signup:The input is not invoice Tax ID!");
      }
    } else {
      if (!Setting.isValidInvoiceTitle(payment.invoiceTitle)) {
        return t("signup:The input is not invoice title!");
      }

      if (!Setting.isValidTaxId(payment.invoiceTaxId)) {
        return t("signup:The input is not invoice Tax ID!");
      }
    }

    return "";
  }

  submitPaymentEdit(exitAfterSave: boolean) {
    if (this.state.payment === null) {
      return;
    }
    const errorText = this.checkError();
    if (errorText !== "") {
      Setting.showMessage("error", errorText);
      return;
    }

    const payment = Setting.deepCopy(this.state.payment) as PaymentRecord;
    PaymentBackend.updatePayment(this.state.payment.owner, this.state.paymentName, payment)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            paymentName: payment.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/payments");
          } else {
            this.props.history.push(`/payments/${payment.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updatePaymentField("name", this.state.paymentName);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deletePayment() {
    if (this.state.payment === null) {
      return;
    }
    PaymentBackend.deletePayment(this.state.payment)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push("/payments");
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
          this.state.payment !== null ? this.renderPayment() : null
        }
        {
          this.renderModal()
        }
        {this.state.mode !== "view" && (
          <div style={{marginTop: "20px", marginLeft: "40px"}}>
            <Button size="large" onClick={() => this.submitPaymentEdit(false)}>{t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitPaymentEdit(true)}>{t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deletePayment()}>{t("general:Cancel")}</Button> : null}
          </div>
        )}
      </div>
    );
  }
}

export default PaymentEditPage;
