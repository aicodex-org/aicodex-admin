import * as Setting from "./Setting";

interface AuditOperationsTableScroll {
  x?: number;
  y?: string;
}

// 审计运维分页列表只固定列表头部和分页，滚动发生在表格数据区，保持与组织等统一列表页一致。
export function getAuditOperationsTableScroll(advancedFiltersOpen?: boolean): AuditOperationsTableScroll {
  if (Setting.isMobile()) {
    return {x: 900};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}
