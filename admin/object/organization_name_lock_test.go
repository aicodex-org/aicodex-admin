// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"strings"
	"testing"

	"github.com/xorm-io/xorm"
	_ "modernc.org/sqlite"
)

func TestUpdateOrganizationRejectsNameChangeForSyncManagedOrganization(t *testing.T) {
	tests := []struct {
		name string
		seed func(t *testing.T)
	}{
		{
			name: "wecom config",
			seed: func(t *testing.T) {
				if _, err := ormer.Engine.Insert(&WecomOrganizationSyncConfig{
					Owner:        "wecom-org",
					Name:         "wecom-config",
					Organization: "sync-org",
					CorpId:       "ww123",
				}); err != nil {
					t.Fatalf("insert wecom config error = %v", err)
				}
			},
		},
		{
			name: "feishu config",
			seed: func(t *testing.T) {
				if _, err := ormer.Engine.Insert(&FeishuOrganizationSyncConfig{
					Owner:        "feishu-org",
					Name:         "feishu-config",
					Organization: "sync-org",
					AppId:        "cli-a",
				}); err != nil {
					t.Fatalf("insert feishu config error = %v", err)
				}
			},
		},
		{
			name: "source connection",
			seed: func(t *testing.T) {
				if _, err := ormer.Engine.Insert(&SourceConnection{
					Owner:              "sync-org",
					Name:               "source-connection",
					OrganizationId:     "sync-org",
					SourceConnectionId: "source-sync-org",
					SourceType:         SourceTypeLark,
					SourceTenantId:     "tenant-a",
				}); err != nil {
					t.Fatalf("insert source connection error = %v", err)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupOrganizationNameLockSqlite(t)
			insertTestOrganization(t, "sync-org", "同步组织")
			tt.seed(t)

			updated := &Organization{Owner: "admin", Name: "renamed-org", DisplayName: "同步组织"}
			affected, err := UpdateOrganization("admin/sync-org", updated, true)
			if err == nil || !strings.Contains(err.Error(), "organization name cannot be changed") {
				t.Fatalf("UpdateOrganization() err = %v, want sync-managed name lock", err)
			}
			if affected {
				t.Fatalf("UpdateOrganization() affected = true, want false")
			}
			organization, err := getOrganization("admin", "sync-org")
			if err != nil || organization == nil {
				t.Fatalf("get original organization organization=%v err=%v", organization, err)
			}
			if organization.Name != "sync-org" {
				t.Fatalf("organization.Name = %q, want sync-org", organization.Name)
			}
		})
	}
}

func TestUpdateOrganizationAllowsDisplayNameChangeForSyncManagedOrganization(t *testing.T) {
	setupOrganizationNameLockSqlite(t)
	insertTestOrganization(t, "sync-org", "Old Name")
	if _, err := ormer.Engine.Insert(&SourceConnection{
		Owner:              "sync-org",
		Name:               "source-connection",
		OrganizationId:     "sync-org",
		SourceConnectionId: "source-sync-org",
		SourceType:         SourceTypeWecom,
		SourceTenantId:     "ww123",
	}); err != nil {
		t.Fatalf("insert source connection error = %v", err)
	}

	updated := &Organization{Owner: "admin", Name: "sync-org", DisplayName: "New Name"}
	affected, err := UpdateOrganization("admin/sync-org", updated, true)
	if err != nil {
		t.Fatalf("UpdateOrganization() error = %v", err)
	}
	if !affected {
		t.Fatalf("UpdateOrganization() affected = false, want true")
	}
	organization, err := getOrganization("admin", "sync-org")
	if err != nil || organization == nil {
		t.Fatalf("get organization organization=%v err=%v", organization, err)
	}
	if organization.DisplayName != "New Name" {
		t.Fatalf("organization.DisplayName = %q, want New Name", organization.DisplayName)
	}
}

func TestGetOrganizationMarksSyncManagedNameLocked(t *testing.T) {
	setupOrganizationNameLockSqlite(t)
	insertTestOrganization(t, "sync-org", "同步组织")
	if _, err := ormer.Engine.Insert(&SourceConnection{
		Owner:              "sync-org",
		Name:               "source-connection",
		OrganizationId:     "sync-org",
		SourceConnectionId: "source-sync-org",
		SourceType:         SourceTypeLark,
		SourceTenantId:     "tenant-a",
	}); err != nil {
		t.Fatalf("insert source connection error = %v", err)
	}

	organization, err := GetMaskedOrganization(GetOrganization("admin/sync-org"))
	if err != nil {
		t.Fatalf("GetMaskedOrganization() error = %v", err)
	}
	if organization == nil || !organization.NameLocked || organization.NameLockReason == "" {
		t.Fatalf("organization lock metadata = %+v, want locked with reason", organization)
	}
}

func setupOrganizationNameLockSqlite(t *testing.T) {
	t.Helper()
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(
		new(Organization),
		new(WecomOrganizationSyncConfig),
		new(FeishuOrganizationSyncConfig),
		new(SourceConnection),
	); err != nil {
		t.Fatalf("sync sqlite tables error = %v", err)
	}
	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		ormer = oldOrmer
		_ = engine.Close()
	})
}

func insertTestOrganization(t *testing.T, name string, displayName string) {
	t.Helper()
	if _, err := ormer.Engine.Insert(&Organization{Owner: "admin", Name: name, DisplayName: displayName}); err != nil {
		t.Fatalf("insert organization error = %v", err)
	}
}
