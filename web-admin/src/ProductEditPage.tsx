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
import {Button, Card, Col, Input, InputNumber, Row, Select, Switch} from "antd";
import * as ProductBackend from "./backend/ProductBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import {LinkOutlined} from "@ant-design/icons";
import * as ProviderBackend from "./backend/ProviderBackend";
import ProductBuyPage from "./ProductBuyPage";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import type {LegacyAny} from "./types/legacyPage";
import type {OrganizationOption, PaymentProviderRecord, ProductRecord, ProductRouteProps} from "./types/productCatalog";

const {Option} = Select;
const t = i18next.t.bind(i18next) as (key: string) => string;
const productBackend = ProductBackend as LegacyAny;
const providerBackend = ProviderBackend as LegacyAny;
const organizationBackend = OrganizationBackend as LegacyAny;
const LegacyProductBuyPage = ProductBuyPage as React.ComponentType<{product?: ProductRecord}>;

interface ProductEditState {
  classes: ProductRouteProps;
  organizationName: string;
  productName: string;
  product: LegacyAny;
  providers: PaymentProviderRecord[];
  organizations: OrganizationOption[];
  mode: string;
}

class ProductEditPage extends React.Component<ProductRouteProps, ProductEditState> {
  constructor(props: ProductRouteProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match?.params.organizationName,
      productName: props.productName !== undefined ? props.productName : props.match?.params.productName,
      product: null,
      providers: [],
      organizations: [],
      mode: props.location?.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount() {
    this.getProduct();
    this.getOrganizations();
    this.getPaymentProviders(this.state.organizationName);
  }

  getProduct() {
    productBackend.getProduct(this.state.organizationName, this.state.productName)
      .then((res: LegacyAny) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        this.setState({
          product: res.data,
        });
      });
  }

  getOrganizations() {
    organizationBackend.getOrganizations("admin")
      .then((res: LegacyAny) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  getPaymentProviders(organizationName: string) {
    providerBackend.getProviders(organizationName)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          this.setState({
            providers: res.data.filter((provider: PaymentProviderRecord) => provider.category === "Payment"),
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  parseProductField(key: string, value: LegacyAny) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateProductField(key: string, value: LegacyAny) {
    value = this.parseProductField(key, value);

    const product = this.state.product as ProductRecord;
    product[key] = value;
    this.setState({
      product: product,
    });
  }

  renderProduct() {
    const product = this.state.product as ProductRecord;
    const isCreatedByPlan = product.tag === "auto_created_product_for_plan";
    const isViewMode = this.state.mode === "view";
    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("product:New Product") : (isViewMode ? t("product:View Product") : t("product:Edit Product"))}&nbsp;&nbsp;&nbsp;&nbsp;
          {!isViewMode && (<>
            <Button onClick={() => this.submitProductEdit(false)}>{t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitProductEdit(true)}>{t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteProduct()}>{t("general:Cancel")}</Button> : null}
          </>)}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={isViewMode || !Setting.isAdminUser(this.props.account) || isCreatedByPlan} value={this.state.product.owner} onChange={(value => {this.updateProductField("owner", value);})}>
              {
                this.state.organizations.map((organization: OrganizationOption, index: number) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.product.name} disabled={isViewMode || isCreatedByPlan} onChange={e => {
              this.updateProductField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.product.displayName} disabled={isViewMode} onChange={e => {
              this.updateProductField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("product:Image"), t("product:Image - Tooltip"))} :
          </Col>
          <Col span={22} style={(Setting.isMobile()) ? {maxWidth: "100%"} : {}}>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 1}>
                {Setting.getLabel(t("general:URL"), t("general:URL - Tooltip"))} :
              </Col>
              <Col span={23} >
                <Input prefix={<LinkOutlined />} value={this.state.product.image} disabled={isViewMode} onChange={e => {
                  this.updateProductField("image", e.target.value);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 1}>
                {t("general:Preview")}:
              </Col>
              <Col span={23} >
                <a target="_blank" rel="noreferrer" href={this.state.product.image}>
                  <img src={this.state.product.image} alt={this.state.product.image} height={90} style={{marginBottom: "20px"}} />
                </a>
              </Col>
            </Row>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("user:Tag"), t("product:Tag - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.product.tag} disabled={isViewMode || isCreatedByPlan} onChange={e => {
              this.updateProductField("tag", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Detail"), t("product:Detail - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.product.detail} disabled={isViewMode} onChange={e => {
              this.updateProductField("detail", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Description"), t("general:Description - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.product.description} disabled={isViewMode} onChange={e => {
              this.updateProductField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("payment:Currency"), t("payment:Currency - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.product.currency} disabled={isViewMode || isCreatedByPlan} onChange={(value => {
              this.updateProductField("currency", value);
            })}>
              {
                Setting.CurrencyOptions.map((item: {id: string}, index: number) => <Option key={index} value={item.id}>{Setting.getCurrencyWithFlag(item.id)}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("product:Is recharge"), t("product:Is recharge - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Switch checked={this.state.product.isRecharge} disabled={isViewMode} onChange={value => {
              this.updateProductField("isRecharge", value);
              if (value) {
                this.updateProductField("price", 0);
                this.updateProductField("disableCustomRecharge", false);
                this.updateProductField("rechargeOptions", []);
              }
            }} />
          </Col>
        </Row>
        {
          this.state.product.isRecharge ? (
            <>
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("product:Disable custom amount"), t("product:Disable custom amount - Tooltip"))} :
                </Col>
                <Col span={1} >
                  <Switch checked={this.state.product.disableCustomRecharge} disabled={isViewMode} onChange={value => {
                    this.updateProductField("disableCustomRecharge", value);
                  }} />
                </Col>
              </Row>
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(t("product:Recharge options"), t("product:Recharge options - Tooltip"))} :
                </Col>
                <Col span={22} >
                  <Select virtual={false} mode="tags" style={{width: "100%"}}
                    disabled={isViewMode}
                    placeholder={t("product:Enter preset amounts")}
                    value={(this.state.product.rechargeOptions || []).map((v: number) => String(v))}
                    onChange={((values: string[]) => {
                      const numbers = values
                        .map((v: string) => parseFloat(v))
                        .filter((v: number) => !isNaN(v) && v > 0)
                        .filter((v: number, i: number, arr: number[]) => arr.indexOf(v) === i)
                        .sort((a: number, b: number) => a - b);
                      this.updateProductField("rechargeOptions", numbers);
                    })}>
                  </Select>
                </Col>
              </Row>
            </>
          ) : (
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(t("order:Price"), t("plan:Price - Tooltip"))} :
              </Col>
              <Col span={22} >
                <InputNumber value={this.state.product.price} disabled={isViewMode || isCreatedByPlan} onChange={value => {
                  this.updateProductField("price", value);
                }} />
              </Col>
            </Row>
          )}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("product:Quantity"), t("product:Quantity - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.product.quantity} disabled={isViewMode || isCreatedByPlan} onChange={value => {
              this.updateProductField("quantity", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("product:Sold"), t("product:Sold - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.product.sold} disabled={isViewMode || isCreatedByPlan} onChange={value => {
              this.updateProductField("sold", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("product:Payment providers"), t("product:Payment providers - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="multiple" style={{width: "100%"}} disabled={isViewMode || isCreatedByPlan} value={this.state.product.providers} onChange={(value => {this.updateProductField("providers", value);})}>
              {
                this.state.providers.map((provider: PaymentProviderRecord, index: number) => <Option key={index} value={provider.name}>{provider.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("product:Success URL"), t("product:Success URL - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input prefix={<LinkOutlined />} value={this.state.product.successUrl} disabled={isViewMode} onChange={e => {
              this.updateProductField("successUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:State"), t("general:State - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.product.state} disabled={isViewMode} onChange={(value => {
              this.updateProductField("state", value);
            })}>
              {
                [
                  {id: "Published", name: "Published"},
                  {id: "Draft", name: "Draft"},
                ].map((item: {id: string; name: string}, index: number) => <Option key={index} value={item.id}>{item.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Preview"), t("general:Preview - Tooltip"))} :
          </Col>
          {
            this.renderPreview()
          }
        </Row>
      </Card>
    );
  }

  renderPreview() {
    const buyUrl = `/products/${this.state.product.owner}/${this.state.product.name}/buy`;
    return (
      <Col span={22} style={{display: "flex", flexDirection: "column"}}>
        <a style={{marginBottom: "10px", display: "flex"}} target="_blank" rel="noreferrer" href={buyUrl}>
          <Button type="primary">{t("product:Test buy page..")}</Button>
        </a>
        <br />
        <br />
        <div style={{width: "90%", border: "1px solid rgb(217,217,217)", boxShadow: "10px 10px 5px #888888", alignItems: "center", overflow: "auto", flexDirection: "column", flex: "auto"}}>
          <LegacyProductBuyPage product={this.state.product} />
        </div>
      </Col>
    );
  }

  submitProductEdit(exitAfterSave: boolean) {
    const product = Setting.deepCopy(this.state.product);
    if (!product.currency) {
      Setting.showMessage("error", t("product:Please select a currency"));
      return;
    }
    if (!product.isCreatedByPlan && (!product.providers || product.providers.length === 0)) {
      Setting.showMessage("error", t("product:Please select at least one payment provider"));
      return;
    }
    if (product.isRecharge && product.disableCustomRecharge && (!product.rechargeOptions || product.rechargeOptions.length === 0)) {
      Setting.showMessage("error", t("product:Please add at least one recharge option when custom amount is disabled"));
      return;
    }

    productBackend.updateProduct(this.state.organizationName, this.state.productName, product)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            productName: this.state.product.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/products");
          } else {
            this.props.history.push(`/products/${this.state.product.owner}/${this.state.product.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateProductField("name", this.state.productName);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteProduct() {
    productBackend.deleteProduct(this.state.product)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          this.props.history.push("/products");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div>
        {
          this.state.product !== null ? this.renderProduct() : null
        }
        {this.state.mode !== "view" && (
          <div style={{marginTop: "20px", marginLeft: "40px"}}>
            <Button size="large" onClick={() => this.submitProductEdit(false)}>{t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitProductEdit(true)}>{t("general:Save & Exit")}</Button>
            {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteProduct()}>{t("general:Cancel")}</Button> : null}
          </div>
        )}
      </div>
    );
  }
}

export default ProductEditPage;
