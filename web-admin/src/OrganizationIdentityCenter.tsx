// Copyright 2026 The AICodex Authors. All Rights Reserved.
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

type OrganizationIdentityPage = "organizations" | "users" | "roles" | "permissions";

interface OrganizationIdentityCenterProps {
  page: OrganizationIdentityPage;
  total?: number;
  loadedCount?: number;
  currentOrganization?: string;
  children: React.ReactNode;
}

function OrganizationIdentityCenter({page, children}: OrganizationIdentityCenterProps): JSX.Element {
  return (
    <div className={`organization-identity-console enterprise-list-page-table-shell organization-identity-compact-list-page organization-identity-compact-list-page-${page}`}>
      {children}
    </div>
  );
}

export default OrganizationIdentityCenter;
