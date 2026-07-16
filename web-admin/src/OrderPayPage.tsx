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
import {Button, Descriptions, Spin} from "antd";
import i18next from "i18next";
import * as OrderBackend from "./backend/OrderBackend";
import * as ProductBackend from "./backend/ProductBackend";
import * as Setting from "./Setting";
import type {AdminRouteProps, LegacyAny} from "./types/legacyPage";
import type {OrderProductInfo, OrderRecord, PaymentAttachInfo, PaymentProductRecord} from "./types/businessPayment";

type PaymentProviderRecord = import("./types/businessPayment").PaymentProviderRecord;

const t = i18next.t.bind(i18next) as (key: string) => string;

interface OrderPayProps extends AdminRouteProps {
  match?: {
    params?: {
      organizationName?: string;
      owner?: string;
      orderName?: string;
      [key: string]: LegacyAny;
    };
    [key: string]: LegacyAny;
  };
}

interface OrderPayState {
  owner: string | null;
  orderName: string | null;
  order: OrderRecord | null;
  firstProduct: PaymentProductRecord | null;
  productInfos: OrderProductInfo[];
  paymentEnv: string;
  isProcessingPayment: boolean;
  isViewMode: boolean;
}

class OrderPayPage extends React.Component<OrderPayProps, OrderPayState> {
  constructor(props: OrderPayProps) {
    super(props);
    this.state = {
      owner: props?.match?.params?.organizationName ?? props?.match?.params?.owner ?? null,
      orderName: props?.match?.params?.orderName ?? null,
      order: null,
      firstProduct: null,
      productInfos: [],
      paymentEnv: "",
      isProcessingPayment: false,
      isViewMode: false,
    };
  }

  getPaymentEnv() {
    let env = "";
    const ua = navigator.userAgent.toLowerCase();
    // Only support WeChat Pay in WeChat Browser for mobile devices
    if (ua.indexOf("micromessenger") !== -1 && ua.indexOf("mobile") !== -1) {
      env = "WechatBrowser";
    }
    this.setState({
      paymentEnv: env,
    });
  }

  componentDidMount() {
    this.getOrder();
    this.getPaymentEnv();
  }

  async getOrder() {
    if (!this.state.owner || !this.state.orderName) {
      return;
    }
    const res = await OrderBackend.getOrder(this.state.owner, this.state.orderName);
    if (res.status === "ok") {
      this.setState({
        order: res.data,
        productInfos: res.data?.productInfos || [],
        isViewMode: res.data?.state !== "Created",
      }, () => {
        this.getProduct();
      });
    } else {
      Setting.showMessage("error", res.msg);
    }
  }

  async getProduct() {
    if (!this.state.order) {
      return;
    }

    const firstProductName = this.state.order?.products?.[0] ?? this.state.order?.productInfos?.[0]?.name;
    if (!firstProductName) {
      return;
    }

    const res = await ProductBackend.getProduct(this.state.order.owner, firstProductName);
    if (res.status === "ok") {
      this.setState({
        firstProduct: res.data,
      });
    } else {
      Setting.showMessage("error", res.msg);
    }
  }

  getPrice(order?: OrderRecord | null) {
    return `${Setting.getCurrencySymbol(order?.currency)}${order?.price} (${Setting.getCurrencyText(order?.currency)})`;
  }

  getProductPrice(product: OrderProductInfo) {
    const price = (product.price ?? 0) * (product.quantity ?? 1);
    return `${Setting.getCurrencySymbol(this.state.order?.currency)}${price.toFixed(2)} (${Setting.getCurrencyText(this.state.order?.currency)})`;
  }

  // Call Wechat Pay via jsapi
  onBridgeReady(attachInfo: PaymentAttachInfo) {
    const {WeixinJSBridge} = window as unknown as {WeixinJSBridge: LegacyAny};
    this.setState({
      isProcessingPayment: false,
    });
    WeixinJSBridge.invoke(
      "getBrandWCPayRequest", {
        "appId": attachInfo.appId,
        "timeStamp": attachInfo.timeStamp,
        "nonceStr": attachInfo.nonceStr,
        "package": attachInfo.package,
        "signType": attachInfo.signType,
        "paySign": attachInfo.paySign,
      },
      (res: {err_msg: string}) => {
        if (res.err_msg === "get_brand_wcpay_request:ok") {
          Setting.goToLink(attachInfo.payment?.successUrl || "");
          return;
        }
        if (res.err_msg === "get_brand_wcpay_request:cancel") {
          Setting.showMessage("error", t("product:Payment cancelled"));
        } else {
          Setting.showMessage("error", t("product:Payment failed"));
        }
      }
    );
  }

  // In WeChat browser, call this function to pay via jsapi
  callWechatPay(attachInfo: PaymentAttachInfo) {
    const {WeixinJSBridge} = window as unknown as {WeixinJSBridge?: LegacyAny};
    if (typeof WeixinJSBridge === "undefined") {
      document.addEventListener("WeixinJSBridgeReady", () => this.onBridgeReady(attachInfo), false);
    } else {
      this.onBridgeReady(attachInfo);
    }
  }

  payOrder(provider: PaymentProviderRecord) {
    const {firstProduct, order} = this.state;
    if (!firstProduct || !order) {
      return;
    }

    this.setState({
      isProcessingPayment: true,
    });

    OrderBackend.payOrder(order.owner, order.name, provider.name, this.state.paymentEnv)
      .then((res) => {
        if (res.status === "ok") {
          const payment = res.data;
          const attachInfo = res.data2 as PaymentAttachInfo;

          let payUrl = payment.payUrl;
          if (provider.type === "WeChat Pay") {
            if (this.state.paymentEnv === "WechatBrowser") {
              attachInfo.payment = payment;
              this.callWechatPay(attachInfo);
              return;
            }
            payUrl = `/qrcode/${payment.owner}/${payment.name}?providerName=${provider.name}&payUrl=${encodeURIComponent(payment.payUrl)}&successUrl=${encodeURIComponent(payment.successUrl)}`;
          }
          Setting.goToLink(payUrl);
        } else {
          Setting.showMessage("error", `${t("product:Payment failed")}: ${res.msg}`);
          this.setState({
            isProcessingPayment: false,
          });
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
        this.setState({
          isProcessingPayment: false,
        });
      });
  }

  getPayButton(provider: PaymentProviderRecord, onClick: () => void) {
    const providerTypeMap: Record<string, string> = {
      "Dummy": t("product:Dummy"),
      "Balance": t("user:Balance"),
      "Alipay": t("product:Alipay"),
      "WeChat Pay": t("product:WeChat Pay"),
      "PayPal": t("product:PayPal"),
      "Stripe": t("product:Stripe"),
      "AirWallex": t("product:AirWallex"),
    };
    const text = providerTypeMap[provider.type] || provider.type;

    return (
      <Button style={{height: "50px", borderWidth: "2px"}} shape="round" icon={
        <img style={{marginRight: "10px"}} width={36} height={36} src={Setting.getProviderLogoURL(provider)} alt={provider.displayName} />
      } size={"large"} onClick={onClick}>
        {text}
      </Button>
    );
  }

  renderProviderButton(provider: PaymentProviderRecord) {
    return (
      <span key={provider.name} style={{width: "200px", marginRight: "20px", marginBottom: "10px"}}>
        {this.getPayButton(provider, () => this.payOrder(provider))}
      </span>
    );
  }

  renderPaymentMethods() {
    const {firstProduct} = this.state;
    if (!firstProduct || !firstProduct.providerObjs || firstProduct.providerObjs.length === 0) {
      return <div>{t("product:There is no payment channel for this product.")}</div>;
    }

    return firstProduct.providerObjs.map((provider: PaymentProviderRecord) => {
      return this.renderProviderButton(provider);
    });
  }

  renderProduct(product: OrderProductInfo) {
    const isSubscriptionOrder = product.pricingName && product.planName;

    return (
      <div key={product.name} style={{marginBottom: "20px", border: "1px solid #f0f0f0", borderRadius: "2px", padding: "1px"}}>
        <Descriptions bordered column={2} size="middle" styles={{label: {width: "150px"}}}>
          <Descriptions.Item label={t("general:Name")} span={2}>
            <span style={{fontSize: 20, fontWeight: "500"}}>
              {Setting.getLanguageText(product?.displayName)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={t("product:Image")} span={2}>
            <img src={product?.image} alt={Setting.getLanguageText(product?.displayName)} height={90} style={{objectFit: "contain"}} />
          </Descriptions.Item>

          <Descriptions.Item label={t("order:Price")} span={1}>
            <span style={{fontSize: 18, fontWeight: "bold"}}>
              {this.getProductPrice(product)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={t("product:Quantity")} span={1}>
            <span style={{fontSize: 18}}>
              {product.quantity ?? 1}
            </span>
          </Descriptions.Item>

          {product?.detail && (
            <Descriptions.Item label={t("general:Detail")} span={2}>
              <span style={{fontSize: 16}}>{Setting.getLanguageText(product?.detail)}</span>
            </Descriptions.Item>
          )}
          {isSubscriptionOrder && (
            <>
              <Descriptions.Item label={t("subscription:Subscription plan")} span={1}>
                <span style={{fontSize: 16}}>{Setting.getLanguageText(product?.planName)}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t("subscription:Subscription pricing")} span={1}>
                <span style={{fontSize: 16}}>{Setting.getLanguageText(product?.pricingName)}</span>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </div>
    );
  }

  render() {
    const {order, productInfos} = this.state;

    const updateTime = order?.updateTime || "";
    const state = order?.state || "";
    const updateTimeMap: Record<string, string> = {
      Paid: t("order:Payment time"),
      Canceled: t("order:Cancel time"),
      Failed: t("order:Payment failed time"),
      Timeout: t("order:Timeout time"),
    };
    const updateTimeLabel = updateTimeMap[state] || t("general:Updated time");
    const shouldShowUpdateTime = state !== "Created" && updateTime !== "";

    if (!order || !productInfos) {
      return null;
    }

    return (
      <div className="login-content">
        <Spin spinning={this.state.isProcessingPayment} size="large" tip={t("product:Processing payment...")} style={{paddingTop: "10%"}} >
          <div style={{marginBottom: "20px"}}>
            <Descriptions title={<span style={Setting.isMobile() ? {fontSize: 18} : {fontSize: 24}}>{t("application:Order")}</span>} bordered column={3}>
              <Descriptions.Item label={t("general:ID")} span={3}>
                <span style={{fontSize: 16}}>
                  {order.name}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={t("general:Status")}>
                <span style={{fontSize: 16}}>
                  {order.state}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={t("general:Created time")}>
                <span style={{fontSize: 16}}>
                  {Setting.getFormattedDate(order.createdTime)}
                </span>
              </Descriptions.Item>
              {shouldShowUpdateTime && (
                <Descriptions.Item label={updateTimeLabel}>
                  <span style={{fontSize: 16}}>
                    {Setting.getFormattedDate(updateTime)}
                  </span>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t("general:User")}>
                <span style={{fontSize: 16}}>
                  {order.user}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div style={{marginBottom: "20px"}}>
            <div style={{fontSize: Setting.isMobile() ? 18 : 24, fontWeight: "bold", marginBottom: "16px", color: "rgba(0, 0, 0, 0.85)"}}>
              {t("product:Information")}
            </div>
            {productInfos.map((product: OrderProductInfo) => this.renderProduct(product))}
          </div>

          <div>
            <Descriptions title={<span style={Setting.isMobile() ? {fontSize: 18} : {fontSize: 24}}>{t("general:Payment")}</span>} bordered column={3}>
              <Descriptions.Item label={t("order:Price")} span={3}>
                <span style={{fontSize: 28, color: "red", fontWeight: "bold"}}>
                  {this.getPrice(order)}
                </span>
              </Descriptions.Item>
              {!this.state.isViewMode && (
                <Descriptions.Item label={t("order:Pay")} span={3}>
                  {this.renderPaymentMethods()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </Spin>
      </div>
    );
  }
}

export default OrderPayPage;
