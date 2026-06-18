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

func TestIsOrganizationSyncApiKeyReadPathAllowsOnlyReadSyncEndpoints(t *testing.T) {
	allowed := []string{
		"/api/organization-sync/export",
		"/api/get-organizations",
		"/api/get-groups",
		"/api/get-organization-applications",
	}

	for _, path := range allowed {
		if !isOrganizationSyncApiKeyReadPath(http.MethodGet, path) {
			t.Fatalf("GET %s should be allowed for organization sync API key", path)
		}
		if isOrganizationSyncApiKeyReadPath(http.MethodPost, path) {
			t.Fatalf("POST %s should be denied for organization sync API key", path)
		}
	}

	denied := []string{
		"/api/add-group",
		"/api/update-group",
		"/api/delete-group",
		"/api/add-organization",
		"/api/update-organization",
		"/api/get-users",
		"/api/organization-sync-api-keys",
	}
	for _, path := range denied {
		if isOrganizationSyncApiKeyReadPath(http.MethodGet, path) {
			t.Fatalf("GET %s should be denied for organization sync API key", path)
		}
	}
}

func TestResolveModuleOrganizationQueryDefaultsOrganizationSyncKeyListToCurrentUserOwner(t *testing.T) {
	got := resolveModuleOrganizationQuery("/api/organization-sync-api-keys", "", "engineering/admin")
	if got != "engineering" {
		t.Fatalf("organization = %q, want engineering", got)
	}

	got = resolveModuleOrganizationQuery("/api/organization-sync-api-keys", "finance", "engineering/admin")
	if got != "finance" {
		t.Fatalf("explicit organization = %q, want finance", got)
	}
}
