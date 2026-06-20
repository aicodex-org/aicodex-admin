import type {AdminRouteProps, LegacyAny} from "./legacyPage";

// 商品目录迁移期的业务 record：后端 client 仍是 JS，保留索引签名承接旧接口的附加字段。
export interface ProductRecord {
  owner: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  image?: string;
  tag?: string;
  detail?: string;
  description?: string;
  currency?: string;
  price?: number;
  quantity?: number;
  sold?: number;
  isRecharge?: boolean;
  disableCustomRecharge?: boolean;
  rechargeOptions?: number[];
  providers?: string[];
  state?: string;
  successUrl?: string;
  [key: string]: LegacyAny;
}

// 购物车里只保存商品引用和购买数量；订单、支付和价格计划字段继续沿用 legacy JS 链路处理。
export interface ProductCartItem {
  name: string;
  createdTime?: string;
  price?: number | null;
  currency?: string;
  pricingName?: string;
  planName?: string;
  quantity?: number;
  [key: string]: LegacyAny;
}

// 商品编辑页只需要可作为支付渠道的 provider 基本信息。
export interface PaymentProviderRecord {
  name: string;
  category?: string;
  [key: string]: LegacyAny;
}

// 商品 owner 下拉仅依赖组织名称，完整组织模型仍由 legacy 组织页面维护。
export interface OrganizationOption {
  name: string;
  [key: string]: LegacyAny;
}

// 商品编辑页沿用历史路由对象，并额外允许直接传入组织和商品名以兼容现有调用方。
export interface ProductRouteProps extends AdminRouteProps {
  organizationName?: string;
  productName?: string;
  location?: {
    mode?: string;
    [key: string]: LegacyAny;
  };
}

export interface PricingRecord {
  owner?: string;
  name?: string;
  [key: string]: LegacyAny;
}

export interface PlanRecord {
  owner?: string;
  name?: string;
  product?: string;
  [key: string]: LegacyAny;
}

export interface ProductUserRecord {
  owner: string;
  name: string;
  cart?: ProductCartItem[];
  [key: string]: LegacyAny;
}
