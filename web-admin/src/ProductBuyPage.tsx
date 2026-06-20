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
import {Button, Descriptions, Divider, InputNumber, Radio, Space, Spin, Typography} from "antd";
import moment from "moment";
import i18next from "i18next";
import * as ProductBackend from "./backend/ProductBackend";
import * as PlanBackend from "./backend/PlanBackend";
import * as PricingBackend from "./backend/PricingBackend";
import * as OrderBackend from "./backend/OrderBackend";
import * as UserBackend from "./backend/UserBackend";
import * as Setting from "./Setting";
import {FloatingCartButton, QuantityStepper} from "./common/product/CartControls";
import type {LegacyAny} from "./types/legacyPage";
import type {PlanRecord, PricingRecord, ProductCartItem, ProductRecord} from "./types/productCatalog";

const t = i18next.t.bind(i18next) as (key: string) => string;

interface ProductBuyProps {
  account?: {
    owner: string;
    name: string;
    [key: string]: LegacyAny;
  };
  history: {
    push: (path: string) => void;
    [key: string]: LegacyAny;
  };
  match?: {
    params?: {
      organizationName?: string;
      owner?: string;
      productName?: string;
      pricingName?: string;
      [key: string]: LegacyAny;
    };
    [key: string]: LegacyAny;
  };
  organizationName?: string;
  productName?: string;
  pricingName?: string;
  product?: ProductRecord | null;
  pricing?: PricingRecord | null;
  onUpdatePricing?: (pricing: PricingRecord) => void;
  [key: string]: LegacyAny;
}

interface ProductBuyState {
  classes: ProductBuyProps;
  owner: string | null;
  productName: string | null;
  pricingName: string | null;
  planName: string | null;
  userName: string | null;
  paymentEnv: string;
  product: ProductRecord | null;
  pricing: PricingRecord | null;
  plan: PlanRecord | null;
  isPlacingOrder: boolean;
  isAddingToCart: boolean;
  customPrice: number;
  buyQuantity: number;
  cartItemCount: number;
}

class ProductBuyPage extends React.Component<ProductBuyProps, ProductBuyState> {
  constructor(props: ProductBuyProps) {
    super(props);
    const params = new URLSearchParams(window.location.search);
    const queryQuantity = params.get("quantity");
    this.state = {
      classes: props,
      owner: props?.organizationName ?? props?.match?.params?.organizationName ?? props?.match?.params?.owner ?? null,
      productName: props?.productName ?? props?.match?.params?.productName ?? null,
      pricingName: props?.pricingName ?? props?.match?.params?.pricingName ?? null,
      planName: params.get("plan"),
      userName: params.get("user"),
      paymentEnv: "",
      product: null,
      pricing: props?.pricing ?? null,
      plan: null,
      isPlacingOrder: false,
      isAddingToCart: false,
      customPrice: 100,
      buyQuantity: queryQuantity ? parseInt(queryQuantity, 10) : 1,
      cartItemCount: 0,
    };
  }

  getPaymentEnv() {
    let env = "";
    const ua = navigator.userAgent.toLocaleLowerCase();
    // Only support Wechat Pay in Wechat Browser for mobile devices
    if (ua.indexOf("micromessenger") !== -1 && ua.indexOf("mobile") !== -1) {
      env = "WechatBrowser";
    }
    this.setState({
      paymentEnv: env,
    });
  }

  UNSAFE_componentWillMount() {
    this.getProduct();
    this.getPaymentEnv();
    this.getCartItemCount();
  }

  getCartItemCount() {
    if (!this.props.account) {
      return;
    }
    const userOwner = this.props.account.owner;
    const userName = this.props.account.name;
    UserBackend.getUser(userOwner, userName).then((res) => {
      if (res.status === "ok" && res.data.cart) {
        this.setState({
          cartItemCount: res.data.cart.length,
        });
      }
    });
  }

  setStateAsync(state: Partial<ProductBuyState>) {
    return new Promise<void>((resolve) => {
      this.setState(state as Pick<ProductBuyState, keyof ProductBuyState>, () => {
        resolve();
      });
    });
  }

  onUpdatePricing(pricing: PricingRecord) {
    this.props.onUpdatePricing?.(pricing);
  }

  async getProduct() {
    if (!this.state.owner || (!this.state.productName && !this.state.pricingName)) {
      return ;
    }
    try {
      // load pricing & plan
      if (this.state.pricingName) {
        if (!this.state.planName || !this.state.userName) {
          return ;
        }
        let res = await PricingBackend.getPricing(this.state.owner, this.state.pricingName);
        if (res.status !== "ok") {
          throw new Error(res.msg);
        }
        const pricing = res.data;
        res = await PlanBackend.getPlan(this.state.owner, this.state.planName);
        if (res.status !== "ok") {
          throw new Error(res.msg);
        }
        const plan = res.data;
        await this.setStateAsync({
          pricing: pricing,
          plan: plan,
          productName: plan.product,
        });
        this.onUpdatePricing(pricing);
      }
      // load product
      const res = await ProductBackend.getProduct(this.state.owner, this.state.productName);
      if (res.status !== "ok") {
        throw new Error(res.msg);
      }
      this.setState({
        product: res.data,
      });

      if (res.data.isRecharge) {
        if (res.data.rechargeOptions?.length > 0) {
          this.setState({
            customPrice: res.data.rechargeOptions[0],
          });
        } else {
          this.setState({
            customPrice: 100,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Setting.showMessage("error", message);
      return;
    }
  }

  getProductObj() {
    if (this.props.product !== undefined) {
      return this.props.product;
    } else {
      return this.state.product;
    }
  }

  getPrice(product?: ProductRecord | null) {
    return `${Setting.getCurrencySymbol(product?.currency)}${product?.price} (${Setting.getCurrencyText(product?.currency)})`;
  }

  addToCart(product: ProductRecord) {
    if (this.state.isAddingToCart) {
      return;
    }

    this.setState({isAddingToCart: true});

    if (!this.props.account) {
      this.setState({isAddingToCart: false});
      return;
    }

    const userOwner = this.props.account.owner;
    const userName = this.props.account.name;

    UserBackend.getUser(userOwner, userName)
      .then((res) => {
        if (res.status === "ok") {
          const user = res.data;
          const cart = (user.cart || []) as ProductCartItem[];

          let actualPrice = product.price;
          if (product.isRecharge) {
            actualPrice = this.state.customPrice;
            if (actualPrice <= 0) {
              Setting.showMessage("error", t("product:Custom price should be greater than zero"));
              this.setState({isAddingToCart: false});
              return;
            }
          }

          const pricingName = this.state.pricingName || "";
          const planName = this.state.planName || "";
          if (cart.length > 0) {
            const firstItem = cart[0];
            if (firstItem.currency && product.currency && firstItem.currency !== product.currency) {
              Setting.showMessage("error", t("product:The currency of the product you are adding is different from the currency of the items in the cart"));
              this.setState({isAddingToCart: false});
              return;
            }
          }

          const cartPrice = product.isRecharge ? actualPrice : null;
          const existingItemIndex = cart.findIndex((item) =>
            item.name === product.name &&
            (product.isRecharge ? item.price === actualPrice : true) &&
            (item.pricingName || "") === pricingName &&
            (item.planName || "") === planName
          );
          const quantityToAdd = this.state.buyQuantity;

          if (existingItemIndex !== -1) {
            cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity ?? 1) + quantityToAdd;
          } else {
            const newProductInfo = {
              name: product.name,
              createdTime: moment().format(),
              price: cartPrice,
              currency: product.currency,
              pricingName: pricingName,
              planName: planName,
              quantity: quantityToAdd,
            };
            cart.push(newProductInfo);
          }

          user.cart = cart;
          UserBackend.updateUser(user.owner, user.name, user)
            .then((res) => {
              if (res.status === "ok") {
                Setting.showMessage("success", t("general:Successfully added"));
                this.setState({
                  cartItemCount: cart.length,
                });
              } else {
                Setting.showMessage("error", res.msg);
              }
            })
            .catch((error) => {
              Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
            })
            .finally(() => {
              this.setState({isAddingToCart: false});
            });
        } else {
          Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${res.msg}`);
          this.setState({isAddingToCart: false});
        }
      })
      .catch((error) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
        this.setState({isAddingToCart: false});
      });
  }

  placeOrder(product: ProductRecord) {
    this.setState({
      isPlacingOrder: true,
    });

    const pricingName = this.state.pricingName || "";
    const planName = this.state.planName || "";
    const customPrice = this.state.customPrice || 0;

    const productInfos = [{
      name: product.name,
      price: product.isRecharge ? customPrice : product.price,
      pricingName: pricingName,
      planName: planName,
      quantity: this.state.buyQuantity,
    }];

    OrderBackend.placeOrder(product.owner, productInfos, this.state.userName ?? "")
      .then((res) => {
        if (res.status === "ok") {
          const order = res.data;
          Setting.showMessage("success", t("product:Order created successfully"));
          // Redirect to order pay page
          Setting.goToLink(`/orders/${order.owner}/${order.name}/pay`);
        } else {
          Setting.showMessage("error", `${t("product:Failed to create order")}: ${res.msg}`);
          this.setState({
            isPlacingOrder: false,
          });
        }
      })
      .catch((error) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
        this.setState({
          isPlacingOrder: false,
        });
      });
  }

  renderRechargeInput(product: ProductRecord) {
    const rechargeOptions = product.rechargeOptions || [];
    const hasOptions = rechargeOptions.length > 0;
    const disableCustom = product.disableCustomRecharge;

    if (!hasOptions && disableCustom) {
      return (
        <Typography.Text type="danger">
          {t("product:This product is currently not purchasable (No options available)")}
        </Typography.Text>
      );
    }

    return (
      <Space direction="vertical" style={{width: "100%"}}>
        {hasOptions && (
          <>
            <div>
              <span style={{marginRight: "10px", fontSize: 16}}>
                {t("product:Select amount")}:
              </span>
              <Radio.Group
                value={this.state.customPrice}
                onChange={(e) => {this.setState({customPrice: e.target.value});}}
              >
                <Space wrap>
                  {rechargeOptions.map((amount: number, index: number) => (
                    <Radio.Button key={index} value={amount}>
                      {Setting.getCurrencySymbol(product.currency)}{amount}
                    </Radio.Button>
                  ))}
                </Space>
              </Radio.Group>
            </div>
            {!disableCustom && <Divider style={{margin: "10px 0"}}>{t("general:Or")}</Divider>}
          </>
        )}
        <Space>
          <span style={{fontSize: 16}}>
            {t("product:Amount")}:
          </span>
          <InputNumber
            min={0}
            value={this.state.customPrice}
            onChange={(e) => {this.setState({customPrice: Number(e) || 0});}}
            disabled={disableCustom}
          />
          <span style={{fontSize: 16}}>{Setting.getCurrencyText(product?.currency)}</span>
        </Space>
      </Space>
    );
  }

  renderPlaceOrderButton(product?: ProductRecord | null) {
    if (product === undefined || product === null) {
      return null;
    }

    if (product.state !== "Published") {
      return t("product:This product is currently not in sale.");
    }

    const hasOptions = product.rechargeOptions && product.rechargeOptions.length > 0;
    const disableCustom = product.disableCustomRecharge;
    const isRechargeUnpurchasable = product.isRecharge && !hasOptions && disableCustom;
    const isAmountZero = product.isRecharge && (this.state.customPrice === 0 || this.state.customPrice === null);

    return (
      <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "25px"}}>
        <QuantityStepper
          value={this.state.buyQuantity}
          min={1}
          onIncrease={() => this.setState((prevState) => ({buyQuantity: prevState.buyQuantity + 1}))}
          onDecrease={() => this.setState((prevState) => ({buyQuantity: Math.max(1, prevState.buyQuantity - 1)}))}
          onChange={(val) => this.setState({buyQuantity: Number(val) || 1})}
          disabled={isRechargeUnpurchasable || this.state.isAddingToCart || isAmountZero}
          style={{
            height: "50px",
            fontSize: "18px",
            width: "140px",
          }}
        />
        <Button
          type="default"
          size="large"
          style={{
            height: "50px",
            fontSize: "18px",
            borderRadius: "30px",
            paddingLeft: "40px",
            paddingRight: "40px",
          }}
          onClick={() => this.addToCart(product)}
          disabled={isRechargeUnpurchasable || this.state.isAddingToCart || isAmountZero}
          loading={this.state.isAddingToCart}
        >
          {t("product:Add to cart")}
        </Button>
        <Button
          type="primary"
          size="large"
          style={{
            height: "50px",
            fontSize: "18px",
            borderRadius: "30px",
            paddingLeft: "40px",
            paddingRight: "40px",
          }}
          onClick={() => this.placeOrder(product)}
          disabled={this.state.isPlacingOrder || isRechargeUnpurchasable || isAmountZero}
          loading={this.state.isPlacingOrder}
        >
          {t("general:Place Order")}
        </Button>
      </div>
    );
  }

  render() {
    const product = this.getProductObj();
    const placeOrderButton = this.renderPlaceOrderButton(product);

    if (product === null) {
      return null;
    }

    return (
      <div className="login-content">
        <FloatingCartButton
          itemCount={this.state.cartItemCount}
          onClick={() => this.props.history.push("/cart")}
        />
        <Spin spinning={this.state.isPlacingOrder} size="large" tip={t("product:Placing order...")} style={{paddingTop: "10%"}} >
          <Descriptions title={<span style={Setting.isMobile() ? {fontSize: 20} : {fontSize: 28}}>{t("product:Buy Product")}</span>} bordered>
            <Descriptions.Item label={t("general:Name")} span={3}>
              <span style={{fontSize: 25}}>
                {Setting.getLanguageText(product?.displayName)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t("general:Detail")}><span style={{fontSize: 16}}>{Setting.getLanguageText(product?.detail)}</span></Descriptions.Item>
            <Descriptions.Item label={t("user:Tag")}><span style={{fontSize: 16}}>{product?.tag}</span></Descriptions.Item>
            <Descriptions.Item label={t("product:SKU")}><span style={{fontSize: 16}}>{product?.name}</span></Descriptions.Item>
            <Descriptions.Item label={t("product:Image")} span={3}>
              <img src={product?.image} alt={product?.name} height={90} style={{marginBottom: "20px"}} />
            </Descriptions.Item>
            {
              product.isRecharge ? (
                <Descriptions.Item span={3} label={t("order:Price")}>
                  {this.renderRechargeInput(product)}
                </Descriptions.Item>
              ) : (
                <React.Fragment>
                  <Descriptions.Item label={t("order:Price")}>
                    <span style={{fontSize: 28, color: "red", fontWeight: "bold"}}>
                      {
                        this.getPrice(product)
                      }
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label={t("product:Quantity")}><span style={{fontSize: 16}}>{product?.quantity}</span></Descriptions.Item>
                  <Descriptions.Item label={t("product:Sold")}><span style={{fontSize: 16}}>{product?.sold}</span></Descriptions.Item>
                </React.Fragment>
              )
            }
            <Descriptions.Item label={t("general:Place Order")} span={3}>
              <div style={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80px"}}>
                {placeOrderButton}
              </div>
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </div>
    );
  }
}

export default ProductBuyPage;
