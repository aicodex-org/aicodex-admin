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
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestResolveWecomOrganizationSyncTargetUsesExplicitOrganization(t *testing.T) {
	organization, err := resolveWecomOrganizationSyncTarget("built-in", nil, true)
	if err != nil {
		t.Fatalf("resolveWecomOrganizationSyncTarget() error = %v", err)
	}
	if organization != "built-in" {
		t.Fatalf("organization = %q, want built-in", organization)
	}
}

func TestResolveWecomOrganizationSyncTargetFallsBackToOrgAdminContext(t *testing.T) {
	organization, err := resolveWecomOrganizationSyncTarget("", &object.User{
		Owner:   "engineering",
		Name:    "admin",
		IsAdmin: true,
	}, false)
	if err != nil {
		t.Fatalf("resolveWecomOrganizationSyncTarget() error = %v", err)
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}

func TestResolveWecomOrganizationSyncTargetRequiresUnambiguousOrganization(t *testing.T) {
	_, err := resolveWecomOrganizationSyncTarget("", &object.User{
		Owner: "engineering",
		Name:  "user",
	}, false)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("normal user without explicit organization error = %v", err)
	}

	_, err = resolveWecomOrganizationSyncTarget("", nil, true)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("global admin without explicit organization error = %v", err)
	}
}

func TestIsWecomOrganizationSyncAdmin(t *testing.T) {
	if !isWecomOrganizationSyncAdmin(nil, true, "built-in") {
		t.Fatalf("global admin should manage any organization")
	}
	if !isWecomOrganizationSyncAdmin(&object.User{Owner: "built-in", IsAdmin: true}, false, "built-in") {
		t.Fatalf("organization admin should manage own organization")
	}
	if isWecomOrganizationSyncAdmin(&object.User{Owner: "engineering", IsAdmin: true}, false, "built-in") {
		t.Fatalf("organization admin must not manage another organization")
	}
	if isWecomOrganizationSyncAdmin(&object.User{Owner: "built-in", IsAdmin: false}, false, "built-in") {
		t.Fatalf("normal user must not manage organization sync APIs")
	}
}

func TestResolveOrganizationManagementScopeTargetDefaultsToCurrentUserOwner(t *testing.T) {
	organization, isAdminScope, err := resolveOrganizationManagementScopeTarget("", &object.User{
		Owner: "engineering",
		Name:  "user",
	}, false)
	if err != nil {
		t.Fatalf("resolveOrganizationManagementScopeTarget() error = %v", err)
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
	if isAdminScope {
		t.Fatalf("normal user should not receive admin scope")
	}
}

func TestResolveOrganizationManagementScopeTargetRejectsUnauthorizedExplicitOrganization(t *testing.T) {
	_, _, err := resolveOrganizationManagementScopeTarget("finance", &object.User{
		Owner: "engineering",
		Name:  "user",
	}, false)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("resolveOrganizationManagementScopeTarget() error = %v, want organization error", err)
	}
}

func TestResolveOrganizationManagementScopeTargetAllowsGlobalAdminSelection(t *testing.T) {
	organization, isAdminScope, err := resolveOrganizationManagementScopeTarget("finance", &object.User{
		Owner:   "built-in",
		Name:    "admin",
		IsAdmin: true,
	}, true)
	if err != nil {
		t.Fatalf("resolveOrganizationManagementScopeTarget() error = %v", err)
	}
	if organization != "finance" {
		t.Fatalf("organization = %q, want finance", organization)
	}
	if !isAdminScope {
		t.Fatalf("global admin should receive admin scope")
	}
}

func TestValidateOrganizationManagementScopeCurrentRequestRejectsUserOverride(t *testing.T) {
	err := validateOrganizationManagementScopeCurrentRequest("built-in/admin")
	if err == nil || !strings.Contains(err.Error(), "current user") {
		t.Fatalf("validateOrganizationManagementScopeCurrentRequest() error = %v, want current user error", err)
	}
}
