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

package controllers

import (
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestNewOrganizationDirectoryQualityQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryQualityQuery(map[string]string{
		"organization":              " org-a ",
		"entityType":                object.OrganizationDirectoryQualityEntityUser,
		"keyword":                   "Alice",
		"sourceType":                object.SourceTypeWecom,
		"sourceConnectionIdHash":    "sha256:source",
		"qualityStatus":             object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":                object.OrganizationMasterDataQualityReasonMappingMissing,
		"lifecycleStatus":           object.PlatformLifecycleStatusActive,
		"p":                         "2",
		"pageSize":                  "50",
		"ignoredPrivateQueryString": "redacted",
	})

	if query.OrganizationId != " org-a " ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "Alice" ||
		query.SourceType != object.SourceTypeWecom ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.LifecycleStatus != object.PlatformLifecycleStatusActive ||
		query.Page != 2 ||
		query.PageSize != 50 {
		t.Fatalf("query = %+v, want parsed operator filters", query)
	}
}
