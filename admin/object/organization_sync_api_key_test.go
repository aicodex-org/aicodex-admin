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

package object

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/xorm-io/xorm"
)

func TestOrganizationSyncApiKeyLifecycleStoresHashAndRotates(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	result, err := AddOrganizationSyncApiKey(&OrganizationSyncApiKey{
		Name:         "gateway-sync",
		Organization: "engineering",
		DisplayName:  "Gateway Sync",
		ExpireTime:   time.Now().Add(time.Hour).UTC().Format(time.RFC3339),
	}, "built-in/admin")
	if err != nil {
		t.Fatalf("AddOrganizationSyncApiKey() error = %v", err)
	}
	if result == nil || result.Key == nil {
		t.Fatalf("AddOrganizationSyncApiKey() result = %#v", result)
	}
	if !strings.HasPrefix(result.Secret, OrganizationSyncApiKeyPrefix) {
		t.Fatalf("secret = %q, want %s prefix", result.Secret, OrganizationSyncApiKeyPrefix)
	}
	if result.Key.Organization != "engineering" || result.Key.Owner != "engineering" {
		t.Fatalf("key target = %s/%s", result.Key.Owner, result.Key.Organization)
	}
	if result.Key.KeyHash == "" || result.Key.KeyHash == result.Secret {
		t.Fatalf("key hash = %q, secret = %q", result.Key.KeyHash, result.Secret)
	}

	keyJSON, err := json.Marshal(result.Key)
	if err != nil {
		t.Fatalf("json marshal key error = %v", err)
	}
	if strings.Contains(string(keyJSON), "keyHash") || strings.Contains(string(keyJSON), result.Key.KeyHash) {
		t.Fatalf("key JSON leaked hash: %s", keyJSON)
	}
	if strings.Contains(string(keyJSON), result.Secret) {
		t.Fatalf("key JSON leaked plaintext secret: %s", keyJSON)
	}

	stored, err := GetOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("GetOrganizationSyncApiKey() error = %v", err)
	}
	if stored == nil {
		t.Fatalf("stored key is nil")
	}
	if stored.KeyHash != result.Key.KeyHash || stored.KeyHash == result.Secret {
		t.Fatalf("stored key hash = %q, secret = %q", stored.KeyHash, result.Secret)
	}
	if stored.KeyPrefix != getOrganizationSyncApiKeyPrefix(result.Secret) {
		t.Fatalf("stored key prefix = %q", stored.KeyPrefix)
	}

	auth, err := AuthenticateOrganizationSyncApiKey(result.Secret, "10.0.0.1", "gateway-sync-test/1.0")
	if err != nil {
		t.Fatalf("AuthenticateOrganizationSyncApiKey() error = %v", err)
	}
	if auth.Organization != "engineering" || auth.Owner != "engineering" || auth.Name != "gateway-sync" {
		t.Fatalf("auth = %#v", auth)
	}

	stored, err = GetOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("GetOrganizationSyncApiKey() after auth error = %v", err)
	}
	if stored.LastUsedTime == "" || stored.LastUsedIp != "10.0.0.1" || stored.LastUsedUserAgent != "gateway-sync-test/1.0" {
		t.Fatalf("last used fields = %#v", stored)
	}

	rotated, err := RotateOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("RotateOrganizationSyncApiKey() error = %v", err)
	}
	if rotated.Secret == result.Secret {
		t.Fatalf("rotated secret reused old secret")
	}
	if rotated.Key.KeyHash == result.Key.KeyHash || rotated.Key.KeyPrefix == result.Key.KeyPrefix {
		t.Fatalf("rotated key did not replace hash/prefix")
	}
	if _, err = AuthenticateOrganizationSyncApiKey(result.Secret, "10.0.0.2", "old"); err == nil {
		t.Fatalf("old secret authenticated after rotation")
	}
	if _, err = AuthenticateOrganizationSyncApiKey(rotated.Secret, "10.0.0.3", "new"); err != nil {
		t.Fatalf("new secret authenticate error = %v", err)
	}

	if ok, err := DisableOrganizationSyncApiKey("engineering/gateway-sync"); err != nil || !ok {
		t.Fatalf("DisableOrganizationSyncApiKey() ok = %v, error = %v", ok, err)
	}
	if _, err = AuthenticateOrganizationSyncApiKey(rotated.Secret, "10.0.0.4", "disabled"); err == nil || !strings.Contains(err.Error(), "disabled") {
		t.Fatalf("disabled key auth error = %v, want disabled", err)
	}

	if ok, err := DeleteOrganizationSyncApiKey(&OrganizationSyncApiKey{Owner: "engineering", Name: "gateway-sync"}); err != nil || !ok {
		t.Fatalf("DeleteOrganizationSyncApiKey() ok = %v, error = %v", ok, err)
	}
	deleted, err := GetOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("GetOrganizationSyncApiKey() after delete error = %v", err)
	}
	if deleted != nil {
		t.Fatalf("deleted key = %#v, want nil", deleted)
	}
}

func TestOrganizationSyncApiKeyRejectsInvalidStates(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	if _, err := AuthenticateOrganizationSyncApiKey(OrganizationSyncApiKeyPrefix+"unknown", "10.0.0.1", "unknown"); err == nil || !strings.Contains(err.Error(), "invalid") {
		t.Fatalf("unknown key error = %v, want invalid", err)
	}

	expired, err := AddOrganizationSyncApiKey(&OrganizationSyncApiKey{
		Name:         "expired-sync",
		Organization: "engineering",
		ExpireTime:   time.Now().Add(-time.Hour).UTC().Format(time.RFC3339),
	}, "built-in/admin")
	if err != nil {
		t.Fatalf("Add expired key error = %v", err)
	}
	if _, err = AuthenticateOrganizationSyncApiKey(expired.Secret, "10.0.0.1", "expired"); err == nil || !strings.Contains(err.Error(), "expired") {
		t.Fatalf("expired key auth error = %v, want expired", err)
	}
}

func TestOrganizationSyncApiKeyRejectsBuiltInTarget(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	if _, err := AddOrganizationSyncApiKey(&OrganizationSyncApiKey{
		Name:         "built-in-sync",
		Organization: "built-in",
	}, "built-in/admin"); err == nil || !strings.Contains(err.Error(), "built-in") {
		t.Fatalf("AddOrganizationSyncApiKey() error = %v, want built-in rejection", err)
	}

	secret, err := GenerateOrganizationSyncApiKeySecret()
	if err != nil {
		t.Fatalf("GenerateOrganizationSyncApiKeySecret() error = %v", err)
	}
	_, err = ormer.Engine.Insert(&OrganizationSyncApiKey{
		Owner:        "built-in",
		Name:         "manual-built-in-sync",
		Organization: "built-in",
		KeyPrefix:    getOrganizationSyncApiKeyPrefix(secret),
		KeyHash:      GetOrganizationSyncApiKeyHash(secret),
		State:        OrganizationSyncApiKeyStateActive,
	})
	if err != nil {
		t.Fatalf("insert manual built-in key error = %v", err)
	}
	if _, err = RotateOrganizationSyncApiKey("built-in/manual-built-in-sync"); err == nil || !strings.Contains(err.Error(), "built-in") {
		t.Fatalf("RotateOrganizationSyncApiKey() error = %v, want built-in rejection", err)
	}
}

func TestGetOrganizationSyncSnapshotReturnsBoundDataAndMasksApplications(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)
	_, err := ormer.Engine.Insert(&Group{
		Owner:       "engineering",
		Name:        "rd",
		DisplayName: "研发部",
		IsTopGroup:  true,
	})
	if err != nil {
		t.Fatalf("insert group error = %v", err)
	}
	_, err = ormer.Engine.Insert(&Application{
		Owner:        "admin",
		Name:         "gateway",
		DisplayName:  "Gateway",
		Organization: "engineering",
		ClientSecret: "plaintext-secret",
	})
	if err != nil {
		t.Fatalf("insert application error = %v", err)
	}

	snapshot, err := GetOrganizationSyncSnapshot("engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSnapshot() error = %v", err)
	}
	if snapshot.Organization == nil || snapshot.Organization.Name != "engineering" {
		t.Fatalf("snapshot organization = %#v", snapshot.Organization)
	}
	if len(snapshot.Groups) != 1 || snapshot.Groups[0].Name != "rd" {
		t.Fatalf("snapshot groups = %#v", snapshot.Groups)
	}
	if len(snapshot.Applications) != 1 || snapshot.Applications[0].Name != "gateway" {
		t.Fatalf("snapshot applications = %#v", snapshot.Applications)
	}
	if snapshot.Applications[0].ClientSecret != "***" {
		t.Fatalf("application client secret = %q, want masked", snapshot.Applications[0].ClientSecret)
	}
}

func setupOrganizationSyncApiKeyTestDB(t *testing.T) {
	t.Helper()

	oldOrmer := ormer
	dbPath := filepath.Join(t.TempDir(), "organization-sync-api-key.db")
	engine, err := xorm.NewEngine("sqlite", dbPath)
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(new(Organization), new(Group), new(Application), new(OrganizationSyncApiKey)); err != nil {
		t.Fatalf("sync tables error = %v", err)
	}
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}

func insertOrganizationSyncApiKeyTestOrganizations(t *testing.T) {
	t.Helper()

	_, err := ormer.Engine.Insert(&Organization{
		Owner:       "admin",
		Name:        "engineering",
		DisplayName: "Engineering",
	})
	if err != nil {
		t.Fatalf("insert engineering organization error = %v", err)
	}
	_, err = ormer.Engine.Insert(&Organization{
		Owner:       "admin",
		Name:        "built-in",
		DisplayName: "Built In",
	})
	if err != nil {
		t.Fatalf("insert built-in organization error = %v", err)
	}
}
