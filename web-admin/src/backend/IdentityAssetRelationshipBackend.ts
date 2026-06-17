import * as Setting from "../Setting";

export interface IdentityAssetRelationshipAggregationParams {
  assetType: string;
  owner: string;
  name: string;
  organization?: string;
}

export function getIdentityAssetRelationshipAggregation(params: IdentityAssetRelationshipAggregationParams): Promise<unknown> {
  const query = new URLSearchParams();
  query.set("assetType", params.assetType);
  query.set("owner", params.owner);
  query.set("name", params.name);

  if (params.organization) {
    query.set("organization", params.organization);
  }

  return fetch(`${Setting.ServerUrl}/api/get-identity-asset-relationship-aggregation?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}
