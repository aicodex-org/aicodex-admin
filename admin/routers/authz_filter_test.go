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

package routers

import (
	"net/http"
	"testing"
)

func TestGetWecomOrganizationSyncObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/wecom-org-sync/config", http.MethodGet, "built-in", nil)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "built-in" || name != "" {
		t.Fatalf("object = %q/%q, want built-in/<empty>", owner, name)
	}
}

func TestGetWecomOrganizationSyncObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering","corpId":"ww123"}`)
	owner, name, ok := getModuleOrganizationObject("/api/wecom-org-sync/config", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/config", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncRunObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/runs/run-1", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected module organization run object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("run object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering","appId":"cli_123"}`)
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/config", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncDryRunPreviewObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering"}`)
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/dry-run-preview", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected dry-run preview organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("dry-run object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncDryRunHistoryObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/dry-run-history/history-1", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected dry-run history organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("dry-run history object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationManagementScopeObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/org-management-scope/current", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization management scope object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationTreeOperationsObjectUsesOrganization(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-tree-operations/diagnostics", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization tree operations object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("diagnostics object = %q/%q, want engineering/<empty>", owner, name)
	}

	body := []byte(`{"organization":"engineering","triggerType":"refresh_status"}`)
	owner, name, ok = getModuleOrganizationObject("/api/organization-tree-operations/refresh", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected organization tree refresh object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("refresh object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryQualityObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/directory", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory quality object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("directory quality object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationPlanObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-plan", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation plan object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation plan object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationActionDraftObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-action-drafts", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation action draft object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation action draft object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationPreflightObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-preflight", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation preflight object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation preflight object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetModuleOrganizationObjectIgnoresUnscopedApi(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/get-providers", http.MethodGet, "engineering", nil)
	if ok || owner != "" || name != "" {
		t.Fatalf("unscoped api object = %q/%q/%v, want empty false", owner, name, ok)
	}
}

func TestResolveModuleOrganizationQueryFallsBackToCurrentUserOwnerForScopeAudit(t *testing.T) {
	organization := resolveModuleOrganizationQuery("/api/org-management-scope/current", "", "engineering/alice")
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}
