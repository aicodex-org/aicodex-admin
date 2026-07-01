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
	"path/filepath"
	"strings"
	"testing"

	"github.com/xorm-io/xorm"
)

func TestCheckManualUserGroupsUpdateRejectsDirectorySyncedGroups(t *testing.T) {
	setupGroupDirectorySyncTestDB(t)

	_, err := ormer.Engine.Insert(&WecomDepartmentMapping{
		Owner:      "engineering",
		Name:       "wecom-dept-2",
		GroupOwner: "engineering",
		GroupName:  "wecom-dept-2",
	})
	if err != nil {
		t.Fatalf("insert wecom mapping error = %v", err)
	}

	oldUser := &User{Owner: "engineering", Name: "alice", Groups: []string{"engineering/wecom-dept-2", "engineering/manual-reviewers"}}
	newUser := &User{Owner: "engineering", Name: "alice", Groups: []string{"engineering/manual-reviewers"}}

	err = CheckManualUserGroupsUpdate(oldUser, newUser)
	if err == nil || !strings.Contains(err.Error(), "directory synced group") {
		t.Fatalf("CheckManualUserGroupsUpdate() error = %v, want directory synced group rejection", err)
	}
}

func TestCheckManualUserGroupsUpdateAllowsManualGroups(t *testing.T) {
	setupGroupDirectorySyncTestDB(t)

	oldUser := &User{Owner: "engineering", Name: "alice", Groups: []string{"engineering/manual-reviewers"}}
	newUser := &User{Owner: "engineering", Name: "alice", Groups: []string{"engineering/manual-reviewers", "engineering/manual-operators"}}

	if err := CheckManualUserGroupsUpdate(oldUser, newUser); err != nil {
		t.Fatalf("CheckManualUserGroupsUpdate() error = %v, want nil for manual groups", err)
	}
}

func TestCheckManualUserGroupsUpdateRejectsBareFeishuGroupName(t *testing.T) {
	setupGroupDirectorySyncTestDB(t)

	_, err := ormer.Engine.Insert(&FeishuDepartmentMapping{
		Owner:      "engineering",
		Name:       "feishu-dept-2",
		GroupOwner: "engineering",
		GroupName:  "feishu-dept-2",
	})
	if err != nil {
		t.Fatalf("insert feishu mapping error = %v", err)
	}

	oldUser := &User{Owner: "engineering", Name: "alice", Groups: []string{"manual-reviewers"}}
	newUser := &User{Owner: "engineering", Name: "alice", Groups: []string{"manual-reviewers", "feishu-dept-2"}}

	err = CheckManualUserGroupsUpdate(oldUser, newUser)
	if err == nil || !strings.Contains(err.Error(), "directory synced group") {
		t.Fatalf("CheckManualUserGroupsUpdate() error = %v, want directory synced group rejection", err)
	}
}

func TestExtendGroupWithDirectorySyncSourcesMarksMappedGroups(t *testing.T) {
	setupGroupDirectorySyncTestDB(t)

	_, err := ormer.Engine.Insert(&WecomDepartmentMapping{
		Owner:      "engineering",
		Name:       "wecom-dept-2",
		GroupOwner: "engineering",
		GroupName:  "wecom-dept-2",
	})
	if err != nil {
		t.Fatalf("insert wecom mapping error = %v", err)
	}

	group := &Group{Owner: "engineering", Name: "wecom-dept-2"}
	if err := ExtendGroupWithDirectorySyncSources(group); err != nil {
		t.Fatalf("ExtendGroupWithDirectorySyncSources() error = %v", err)
	}
	if !group.IsDirectorySynced || len(group.DirectorySyncSources) != 1 || group.DirectorySyncSources[0] != "wecom" {
		t.Fatalf("directory sync fields = synced:%v sources:%v", group.IsDirectorySynced, group.DirectorySyncSources)
	}
}

func setupGroupDirectorySyncTestDB(t *testing.T) {
	t.Helper()

	oldOrmer := ormer
	dbPath := filepath.Join(t.TempDir(), "group-directory-sync.db")
	engine, err := xorm.NewEngine("sqlite", dbPath)
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(
		new(WecomDepartmentMapping),
		new(FeishuDepartmentMapping),
	); err != nil {
		t.Fatalf("sync tables error = %v", err)
	}
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}
