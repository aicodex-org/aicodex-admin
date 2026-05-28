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
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestWecomOrganizationSyncModelsUseTimeAndExplicitBoolTags(t *testing.T) {
	timeType := reflect.TypeOf(time.Time{})

	tests := []struct {
		name       string
		model      any
		timeFields []string
		boolFields []string
	}{
		{
			name:       "sync config",
			model:      WecomOrganizationSyncConfig{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "LastSyncedAt"},
			boolFields: []string{"IsEnabled", "SoftDisableMissingData"},
		},
		{
			name:       "sync run",
			model:      WecomOrganizationSyncRun{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "StartedAt", "FinishedAt", "HeartbeatAt", "LeaseExpiresAt"},
		},
		{
			name:       "department mapping",
			model:      WecomDepartmentMapping{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "LastSyncedAt"},
			boolFields: []string{"IsEnabled"},
		},
		{
			name:       "user mapping",
			model:      WecomUserMapping{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "LastSyncedAt"},
			boolFields: []string{"IsEnabled"},
		},
		{
			name:       "user department",
			model:      WecomUserDepartment{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "LastSyncedAt"},
			boolFields: []string{"IsMain", "IsLeader", "IsEnabled"},
		},
		{
			name:       "department leader",
			model:      WecomDepartmentLeader{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "LastSyncedAt"},
			boolFields: []string{"IsPrimary", "IsEnabled"},
		},
		{
			name:       "user direct leader",
			model:      WecomUserDirectLeader{},
			timeFields: []string{"CreatedAt", "UpdatedAt", "LastSyncedAt"},
			boolFields: []string{"IsEnabled"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			modelType := reflect.TypeOf(tt.model)
			for _, fieldName := range tt.timeFields {
				field, ok := modelType.FieldByName(fieldName)
				if !ok {
					t.Fatalf("missing time field %s", fieldName)
				}
				if field.Type != timeType {
					t.Fatalf("%s should use time.Time, got %s", fieldName, field.Type)
				}
				if !strings.Contains(strings.ToLower(field.Tag.Get("xorm")), "timestampz") {
					t.Fatalf("%s should declare timestampz xorm tag, got %q", fieldName, field.Tag.Get("xorm"))
				}
			}

			for _, fieldName := range tt.boolFields {
				field, ok := modelType.FieldByName(fieldName)
				if !ok {
					t.Fatalf("missing bool field %s", fieldName)
				}
				if field.Type.Kind() != reflect.Bool {
					t.Fatalf("%s should use bool, got %s", fieldName, field.Type)
				}
				if field.Tag.Get("json") == "" {
					t.Fatalf("%s should declare explicit json tag", fieldName)
				}
				if field.Tag.Get("xorm") == "" {
					t.Fatalf("%s should declare explicit xorm tag", fieldName)
				}
			}
		})
	}
}

func TestGetWecomRelationshipNameIsStableAndBounded(t *testing.T) {
	name := GetWecomRelationshipName("built-in", "ww1234567890", "department-leader", "1", "zhangsan")
	same := GetWecomRelationshipName("built-in", "ww1234567890", "department-leader", "1", "zhangsan")
	different := GetWecomRelationshipName("built-in", "ww1234567890", "department-leader", "1", "lisi")

	if name != same {
		t.Fatalf("relationship name should be stable: %s != %s", name, same)
	}
	if name == different {
		t.Fatalf("relationship name should change when stable relationship parts change")
	}
	if !strings.HasPrefix(name, "rel-") {
		t.Fatalf("relationship name should use rel- prefix, got %s", name)
	}
	if len(name) != len("rel-")+64 {
		t.Fatalf("relationship name should use full sha256 hex digest, got length %d", len(name))
	}
	if len(name) > 100 {
		t.Fatalf("relationship name should fit varchar(100), got length %d", len(name))
	}
}

func TestWecomOrganizationSyncConfigSecretMaskAndPreserve(t *testing.T) {
	config := &WecomOrganizationSyncConfig{
		AddressBookSecret: "real-secret",
	}

	masked := GetMaskedWecomOrganizationSyncConfig(config, true)
	if masked.AddressBookSecret != WecomOrganizationSyncMaskedSecret {
		t.Fatalf("masked secret = %q, want %q", masked.AddressBookSecret, WecomOrganizationSyncMaskedSecret)
	}
	if config.AddressBookSecret != "real-secret" {
		t.Fatalf("masking should not mutate original config, got %q", config.AddressBookSecret)
	}

	unmasked := GetMaskedWecomOrganizationSyncConfig(config, false)
	if unmasked.AddressBookSecret != "real-secret" {
		t.Fatalf("unmasked secret = %q, want real-secret", unmasked.AddressBookSecret)
	}

	incoming := &WecomOrganizationSyncConfig{
		AddressBookSecret: WecomOrganizationSyncMaskedSecret,
	}
	ApplyWecomOrganizationSyncConfigSecretUpdate(config, incoming)
	if incoming.AddressBookSecret != "real-secret" {
		t.Fatalf("masked incoming secret should preserve old value, got %q", incoming.AddressBookSecret)
	}

	replaced := &WecomOrganizationSyncConfig{
		AddressBookSecret: "new-secret",
	}
	ApplyWecomOrganizationSyncConfigSecretUpdate(config, replaced)
	if replaced.AddressBookSecret != "new-secret" {
		t.Fatalf("new incoming secret should be kept, got %q", replaced.AddressBookSecret)
	}
}
