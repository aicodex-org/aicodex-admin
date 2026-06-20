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
import * as Conf from "./Conf";
import * as ProductBackend from "./backend/ProductBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {EditOutlined} from "@ant-design/icons";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import type {AdminRouteProps, LegacyAny} from "./types/legacyPage";
import {legacyColumns} from "./types/legacyPage";
import type {ProductRecord} from "./types/productCatalog";

const t = i18next.t.bind(i18next) as (key: string) => string;
const productBackend = ProductBackend as LegacyAny;

// BaseListPage 仍是 legacy JS 类；这里用 interface merge 补齐本页实际使用的基类 props/state/helper。
interface ProductListPage {
  props: AdminRouteProps;
  state: LegacyAny;
  getColumnSearchProps: (dataIndex: string, customRender?: LegacyAny) => LegacyAny;
  getTablePaginationProps: () => LegacyAny;
  handleTableChange: LegacyAny;
}

interface ProductListFetchParams {
  pagination?: LegacyAny;
  searchedColumn?: string;
  searchText?: string;
  sortField?: string;
  sortOrder?: string;
  type?: string;
}

class ProductListPage extends BaseListPage {
  newProduct() {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `product_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Product - ${randomName}`,
      image: Conf.BrandIcon,
      tag: "aicodex-admin Summit 2026",
      currency: "USD",
      price: 300,
      quantity: 99,
      sold: 10,
      isRecharge: false,
      providers: [],
      state: "Published",
    };
  }

  addProduct() {
    const newProduct = this.newProduct();
    productBackend.addProduct(newProduct)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/products/${newProduct.owner}/${newProduct.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteProduct(i: number) {
    productBackend.deleteProduct(this.state.data[i])
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: this.state.pagination.current > 1 && this.state.data.length === 1 ? this.state.pagination.current - 1 : this.state.pagination.current,
            },
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(products: ProductRecord[]) {
    const columns = legacyColumns<ProductRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "140px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: string, record: ProductRecord) => {
          return (
            <Link to={`/products/${record.owner}/${text}`}>
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
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "170px",
        sorter: true,
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: t("product:Image"),
        dataIndex: "image",
        key: "image",
        width: "170px",
        render: (text: string) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              <img src={text} alt={text} width={150} />
            </a>
          );
        },
      },
      {
        title: t("user:Tag"),
        dataIndex: "tag",
        key: "tag",
        width: "160px",
        sorter: true,
        ...this.getColumnSearchProps("tag"),
      },
      {
        title: t("order:Price"),
        dataIndex: "price",
        key: "price",
        width: "160px",
        sorter: true,
        ...this.getColumnSearchProps("price"),
        render: (_text: LegacyAny, record: ProductRecord) => {
          return Setting.getPriceDisplay(record.price, record.currency);
        },
      },
      {
        title: t("product:Quantity"),
        dataIndex: "quantity",
        key: "quantity",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("quantity"),
      },
      {
        title: t("product:Sold"),
        dataIndex: "sold",
        key: "sold",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("sold"),
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
        title: t("product:Payment providers"),
        dataIndex: "providers",
        key: "providers",
        width: "500px",
        ...this.getColumnSearchProps("providers"),
        render: (text: string[], record: ProductRecord) => {
          const providerOwner = record.owner;
          const providers = text;
          if (providers.length === 0) {
            return `(${t("general:empty")})`;
          }

          const half = Math.floor((providers.length + 1) / 2);

          const getList = (providers: string[]) => {
            return (
              <List
                size="small"
                locale={{emptyText: " "}}
                dataSource={providers}
                renderItem={(providerName: string) => {
                  return (
                    <List.Item>
                      <div style={{display: "inline"}}>
                        <Tooltip placement="topLeft" title="Edit">
                          <Button style={{marginRight: "5px"}} icon={<EditOutlined />} size="small" onClick={() => Setting.goToLinkSoft(this, `/providers/${providerOwner}/${providerName}`)} />
                        </Tooltip>
                        <Link to={`/providers/${providerOwner}/${providerName}`}>
                          {providerName}
                        </Link>
                      </div>
                    </List.Item>
                  );
                }}
              />
            );
          };

          return (
            <div>
              <Row>
                <Col span={12}>
                  {
                    getList(providers.slice(0, half))
                  }
                </Col>
                <Col span={12}>
                  {
                    getList(providers.slice(half))
                  }
                </Col>
              </Row>
            </div>
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "230px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (_text: LegacyAny, record: ProductRecord, index: number) => {
          const isCreatedByPlan = record.tag === "auto_created_product_for_plan";
          const isAdmin = Setting.isLocalAdminUser(this.props.account);
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/products/${record.owner}/${record.name}/buy`)}>{t("product:Buy")}</Button>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push({pathname: `/products/${record.owner}/${record.name}`, mode: isAdmin ? "edit" : "view"})}>{isAdmin ? t("general:Edit") : t("general:View")}</Button>
              <PopconfirmModal
                disabled={isCreatedByPlan || !isAdmin}
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteProduct(index)}
              >
              </PopconfirmModal>
            </div>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns as LegacyAny} dataSource={products} rowKey={(record: ProductRecord) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => {
            const isAdmin = Setting.isLocalAdminUser(this.props.account);
            return (
              <div>
                {t("general:Products")}&nbsp;&nbsp;&nbsp;&nbsp;
                <Button type="primary" size="small" disabled={!isAdmin} onClick={this.addProduct.bind(this)}>{t("general:Add")}</Button>
              </div>
            );
          }}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: ProductListFetchParams = {}) => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    const pagination = params.pagination || this.state.pagination;
    productBackend.getProducts(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: LegacyAny) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...pagination,
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

export default ProductListPage;
