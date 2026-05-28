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

func TestGetOrganizationManagementScopeObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/org-management-scope/current", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization management scope object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestResolveModuleOrganizationQueryFallsBackToCurrentUserOwnerForScopeAudit(t *testing.T) {
	organization := resolveModuleOrganizationQuery("/api/org-management-scope/current", "", "engineering/alice")
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}
