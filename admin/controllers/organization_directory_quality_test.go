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

func TestNewOrganizationDirectoryRemediationPlanQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationPlanQuery(map[string]string{
		"organization":           " org-a ",
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "Alice",
		"sourceType":             object.SourceTypeWecom,
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"lifecycleStatus":        object.PlatformLifecycleStatusActive,
		"limit":                  "30",
		"topN":                   "10",
	})

	if query.OrganizationId != " org-a " ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "Alice" ||
		query.SourceType != object.SourceTypeWecom ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.LifecycleStatus != object.PlatformLifecycleStatusActive ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation plan filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationActionDraftQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationActionDraftQuery(map[string]string{
		"organization":           " org-a ",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "Alice",
		"sourceType":             object.SourceTypeWecom,
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"limit":                  "30",
		"topN":                   "10",
	})

	if query.OrganizationId != " org-a " ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "Alice" ||
		query.SourceType != object.SourceTypeWecom ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation action draft filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationPreflightQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationPreflightQuery(map[string]string{
		"organization":           "org-a",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation preflight filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationApprovalPreviewQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationApprovalPreviewQuery(map[string]string{
		"organization":           "org-a",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation approval preview filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationApprovalPacketAuditQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationApprovalPacketAuditQuery(map[string]string{
		"organization":           "org-a",
		"packetAuditId":          "approval-packet-audit:packet",
		"packetHash":             "",
		"approvalPreviewId":      "approval-preview:preview",
		"approvalPreviewHash":    "sha256:preview",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"riskLevel":              object.OrganizationDirectoryRemediationApprovalRiskMedium,
		"packetStatus":           object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.PacketAuditId != "approval-packet-audit:packet" ||
		query.ApprovalPreviewId != "approval-preview:preview" ||
		query.ApprovalPreviewHash != "sha256:preview" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.RiskLevel != object.OrganizationDirectoryRemediationApprovalRiskMedium ||
		query.PacketStatus != object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation approval packet audit filters", query)
	}
}
