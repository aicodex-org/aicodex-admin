import type {LegacyAny} from "./legacyPage";

// 商业付款迁移期的订单商品快照：真实订单/支付语义仍由后端 API 和 legacy backend client 维护。
export interface OrderProductInfo {
  name: string;
  displayName?: string;
  price?: number;
  quantity?: number;
  pricingName?: string;
  planName?: string;
  image?: string;
  detail?: string;
  [key: string]: LegacyAny;
}

// 订单页面只读取和维护这些前端字段；支付 provider、回调和状态机不在前端类型里重定义真值。
export interface OrderRecord {
  owner: string;
  name: string;
  createdTime?: string;
  updateTime?: string;
  displayName?: string;
  products?: string[];
  productInfos?: OrderProductInfo[];
  user?: string;
  payment?: string;
  price?: number;
  currency?: string;
  state?: string;
  message?: string;
  [key: string]: LegacyAny;
}

export interface PaymentInvoiceFields {
  invoiceUrl?: string;
  invoiceType?: string;
  invoiceTitle?: string;
  invoiceTaxId?: string;
  invoiceRemark?: string;
  personName?: string;
  personIdCard?: string;
  personEmail?: string;
  personPhone?: string;
}

export interface PaymentRecord extends PaymentInvoiceFields {
  owner?: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  provider?: string;
  type?: string;
  user?: string;
  products?: string[];
  productsDisplayName?: string;
  order?: string;
  orderObj?: {
    productInfos?: OrderProductInfo[];
    [key: string]: LegacyAny;
  };
  detail?: string;
  tag?: string;
  currency?: string;
  price?: number;
  state?: string;
  message?: string;
  isRecharge?: boolean;
  payUrl?: string;
  successUrl?: string;
  [key: string]: LegacyAny;
}

export interface PricingRecord {
  owner?: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  description?: string;
  application?: string;
  plans?: string[];
  isEnabled?: boolean;
  trialDuration?: number;
  [key: string]: LegacyAny;
}

export interface PlanRecord {
  owner?: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  description?: string;
  price?: number;
  currency?: string;
  period?: string;
  role?: string;
  product?: string;
  paymentProviders?: string[];
  isEnabled?: boolean;
  isExclusive?: boolean;
  [key: string]: LegacyAny;
}

export interface SubscriptionRecord {
  owner?: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  startTime?: string;
  endTime?: string;
  period?: string;
  description?: string;
  user?: string;
  pricing?: string;
  plan?: string;
  payment?: string;
  state?: string;
  approver?: string;
  approveTime?: string;
  [key: string]: LegacyAny;
}

export interface PaymentOrganizationRecord {
  name: string;
  [key: string]: LegacyAny;
}

export interface PaymentApplicationRecord {
  name: string;
  [key: string]: LegacyAny;
}

export interface PaymentUserRecord {
  owner?: string;
  name?: string;
  balance?: number;
  [key: string]: LegacyAny;
}

export interface PaymentProviderRecord {
  owner?: string;
  name: string;
  displayName?: string;
  type: string;
  [key: string]: LegacyAny;
}

export interface PaymentAttachInfo {
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: string;
  paySign?: string;
  payment?: PaymentRecord;
  [key: string]: LegacyAny;
}

export interface PaymentProductRecord {
  owner?: string;
  name: string;
  displayName?: string;
  image?: string;
  detail?: string;
  providerObjs?: PaymentProviderRecord[];
  [key: string]: LegacyAny;
}
