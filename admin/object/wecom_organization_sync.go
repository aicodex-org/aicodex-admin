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
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
)

type WecomOrganizationSyncRunStatus string

const (
	WecomOrganizationSyncRunStatusRunning   WecomOrganizationSyncRunStatus = "running"
	WecomOrganizationSyncRunStatusSucceeded WecomOrganizationSyncRunStatus = "succeeded"
	WecomOrganizationSyncRunStatusFailed    WecomOrganizationSyncRunStatus = "failed"
	WecomOrganizationSyncRunStatusPartial   WecomOrganizationSyncRunStatus = "partial"
)

type WecomOrganizationSyncRunStage string

const (
	WecomOrganizationSyncRunStageFetching   WecomOrganizationSyncRunStage = "fetching"
	WecomOrganizationSyncRunStagePlanning   WecomOrganizationSyncRunStage = "planning"
	WecomOrganizationSyncRunStageApplying   WecomOrganizationSyncRunStage = "applying"
	WecomOrganizationSyncRunStageFinalizing WecomOrganizationSyncRunStage = "finalizing"
)

type WecomOrganizationSyncTriggerType string

const (
	WecomOrganizationSyncTriggerManual    WecomOrganizationSyncTriggerType = "manual"
	WecomOrganizationSyncTriggerScheduled WecomOrganizationSyncTriggerType = "scheduled"
	WecomOrganizationSyncTriggerCallback  WecomOrganizationSyncTriggerType = "callback"
)

const (
	WecomOrganizationSyncMaskedSecret = "***"

	WecomRelationshipTypeUserDepartment = "user-department"
	WecomRelationshipTypeDepartmentLead = "department-leader"
	WecomRelationshipTypeDirectLeader   = "direct-leader"
)

// WecomOrganizationSyncConfig 保存目标组织的一套企业微信通讯录同步来源。
type WecomOrganizationSyncConfig struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization           string    `xorm:"varchar(100) index unique(wecom_sync_config_org_corp)" json:"organization"`
	CorpId                 string    `xorm:"varchar(100) index unique(wecom_sync_config_org_corp)" json:"corpId"`
	AddressBookSecret      string    `xorm:"text" json:"addressBookSecret"`
	IsEnabled              bool      `xorm:"bool index" json:"isEnabled"`
	SoftDisableMissingData bool      `xorm:"bool" json:"softDisableMissingData"`
	LastRunId              string    `xorm:"varchar(100) index" json:"lastRunId"`
	LastSyncedAt           time.Time `xorm:"timestampz" json:"lastSyncedAt"`

	// Schedule* 字段仅用于企业微信配置 API/页面读写，持久化来源是通用 OrganizationSyncSchedule 表。
	ScheduleEnabled  bool   `xorm:"-" json:"scheduleEnabled"`
	ScheduleCron     string `xorm:"-" json:"scheduleCron"`
	ScheduleTimezone string `xorm:"-" json:"scheduleTimezone"`

	// ScheduleLast* 字段展示最近一次调度派发摘要，不代表企业微信同步 run 的最终状态。
	ScheduleLastFireAt    time.Time `xorm:"-" json:"scheduleLastFireAt"`
	ScheduleLastRunId     string    `xorm:"-" json:"scheduleLastRunId"`
	ScheduleLastStatus    string    `xorm:"-" json:"scheduleLastStatus"`
	ScheduleLastErrorCode string    `xorm:"-" json:"scheduleLastErrorCode"`
	ScheduleLastErrorText string    `xorm:"-" json:"scheduleLastErrorText"`
}

// WecomOrganizationSyncRun 记录一次企业微信组织架构同步执行。
type WecomOrganizationSyncRun struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization   string                           `xorm:"varchar(100) index" json:"organization"`
	ConfigName     string                           `xorm:"varchar(100) index" json:"configName"`
	CorpId         string                           `xorm:"varchar(100) index" json:"corpId"`
	TriggerType    WecomOrganizationSyncTriggerType `xorm:"varchar(50)" json:"triggerType"`
	Actor          string                           `xorm:"varchar(100) index" json:"actor"`
	Status         WecomOrganizationSyncRunStatus   `xorm:"varchar(50) index" json:"status"`
	Stage          WecomOrganizationSyncRunStage    `xorm:"varchar(50)" json:"stage"`
	StartedAt      time.Time                        `xorm:"timestampz index" json:"startedAt"`
	FinishedAt     time.Time                        `xorm:"timestampz" json:"finishedAt"`
	HeartbeatAt    time.Time                        `xorm:"timestampz index" json:"heartbeatAt"`
	LeaseExpiresAt time.Time                        `xorm:"timestampz index" json:"leaseExpiresAt"`

	DepartmentFetchedCount   int    `xorm:"int" json:"departmentFetchedCount"`
	DepartmentCreatedCount   int    `xorm:"int" json:"departmentCreatedCount"`
	DepartmentUpdatedCount   int    `xorm:"int" json:"departmentUpdatedCount"`
	DepartmentDisabledCount  int    `xorm:"int" json:"departmentDisabledCount"`
	UserFetchedCount         int    `xorm:"int" json:"userFetchedCount"`
	UserCreatedCount         int    `xorm:"int" json:"userCreatedCount"`
	UserUpdatedCount         int    `xorm:"int" json:"userUpdatedCount"`
	UserDisabledCount        int    `xorm:"int" json:"userDisabledCount"`
	MembershipUpdatedCount   int    `xorm:"int" json:"membershipUpdatedCount"`
	ManagerUpdatedCount      int    `xorm:"int" json:"managerUpdatedCount"`
	DirectLeaderUpdatedCount int    `xorm:"int" json:"directLeaderUpdatedCount"`
	ErrorCode                string `xorm:"varchar(100)" json:"errorCode"`
	ErrorText                string `xorm:"text" json:"errorText"`
}

// WecomDepartmentMapping 保存企业微信部门与本地 Group 的稳定绑定。
type WecomDepartmentMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization             string    `xorm:"varchar(100) index unique(wecom_dept_mapping_external)" json:"organization"`
	CorpId                   string    `xorm:"varchar(100) index unique(wecom_dept_mapping_external)" json:"corpId"`
	DepartmentId             string    `xorm:"varchar(100) index unique(wecom_dept_mapping_external)" json:"departmentId"`
	GroupOwner               string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName                string    `xorm:"varchar(100) index" json:"groupName"`
	ParentDepartmentId       string    `xorm:"varchar(100) index" json:"parentDepartmentId"`
	ParentGroupOwner         string    `xorm:"varchar(100) index" json:"parentGroupOwner"`
	ParentGroupName          string    `xorm:"varchar(100) index" json:"parentGroupName"`
	DisplayName              string    `xorm:"varchar(100)" json:"displayName"`
	Order                    int       `xorm:"int" json:"order"`
	PrimaryLeaderWecomUserId string    `xorm:"varchar(255) index" json:"primaryLeaderWecomUserId"`
	IsEnabled                bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId        string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId            string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt             time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// WecomUserMapping 保存企业微信成员与本地 User 的稳定绑定。
type WecomUserMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization           string    `xorm:"varchar(100) index unique(wecom_user_mapping_external)" json:"organization"`
	CorpId                 string    `xorm:"varchar(100) index unique(wecom_user_mapping_external)" json:"corpId"`
	WecomUserId            string    `xorm:"varchar(255) index unique(wecom_user_mapping_external)" json:"wecomUserId"`
	UserOwner              string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName               string    `xorm:"varchar(255) index" json:"userName"`
	ExternalId             string    `xorm:"varchar(500) index" json:"externalId"`
	MainDepartmentId       string    `xorm:"varchar(100) index" json:"mainDepartmentId"`
	Status                 int       `xorm:"int index" json:"status"`
	PossibleDuplicateUsers string    `xorm:"text" json:"possibleDuplicateUsers"`
	IsEnabled              bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId      string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId          string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt           time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// WecomUserDepartment 保存企业微信成员部门关系和主部门标记。
type WecomUserDepartment struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(wecom_user_department_external)" json:"organization"`
	CorpId            string    `xorm:"varchar(100) index unique(wecom_user_department_external)" json:"corpId"`
	WecomUserId       string    `xorm:"varchar(255) index unique(wecom_user_department_external)" json:"wecomUserId"`
	DepartmentId      string    `xorm:"varchar(100) index unique(wecom_user_department_external)" json:"departmentId"`
	UserOwner         string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName          string    `xorm:"varchar(255) index" json:"userName"`
	GroupOwner        string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName         string    `xorm:"varchar(100) index" json:"groupName"`
	IsMain            bool      `xorm:"bool index" json:"isMain"`
	IsLeader          bool      `xorm:"bool index" json:"isLeader"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// WecomDepartmentLeader 保存企业微信部门负责人关系。
type WecomDepartmentLeader struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(wecom_department_leader_external)" json:"organization"`
	CorpId            string    `xorm:"varchar(100) index unique(wecom_department_leader_external)" json:"corpId"`
	DepartmentId      string    `xorm:"varchar(100) index unique(wecom_department_leader_external)" json:"departmentId"`
	GroupOwner        string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName         string    `xorm:"varchar(100) index" json:"groupName"`
	LeaderWecomUserId string    `xorm:"varchar(255) index unique(wecom_department_leader_external)" json:"leaderWecomUserId"`
	LeaderUserOwner   string    `xorm:"varchar(100) index" json:"leaderUserOwner"`
	LeaderUserName    string    `xorm:"varchar(255) index" json:"leaderUserName"`
	IsPrimary         bool      `xorm:"bool index" json:"isPrimary"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// WecomUserDirectLeader 保存明确的企业微信直属上级关系。
type WecomUserDirectLeader struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(wecom_user_direct_leader_external)" json:"organization"`
	CorpId            string    `xorm:"varchar(100) index unique(wecom_user_direct_leader_external)" json:"corpId"`
	WecomUserId       string    `xorm:"varchar(255) index unique(wecom_user_direct_leader_external)" json:"wecomUserId"`
	LeaderWecomUserId string    `xorm:"varchar(255) index unique(wecom_user_direct_leader_external)" json:"leaderWecomUserId"`
	UserOwner         string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName          string    `xorm:"varchar(255) index" json:"userName"`
	LeaderUserOwner   string    `xorm:"varchar(100) index" json:"leaderUserOwner"`
	LeaderUserName    string    `xorm:"varchar(255) index" json:"leaderUserName"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

func GetWecomRelationshipName(organization string, corpId string, relationshipType string, ids ...string) string {
	parts := append([]string{organization, corpId, relationshipType}, ids...)
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x1f")))
	return "rel-" + hex.EncodeToString(sum[:])
}

func GetMaskedWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig, isMaskEnabled bool) *WecomOrganizationSyncConfig {
	if config == nil {
		return nil
	}

	maskedConfig := *config
	if isMaskEnabled && maskedConfig.AddressBookSecret != "" {
		maskedConfig.AddressBookSecret = WecomOrganizationSyncMaskedSecret
	}
	return &maskedConfig
}

func ApplyWecomOrganizationSyncConfigSecretUpdate(oldConfig *WecomOrganizationSyncConfig, newConfig *WecomOrganizationSyncConfig) {
	if oldConfig == nil || newConfig == nil {
		return
	}

	if newConfig.AddressBookSecret == WecomOrganizationSyncMaskedSecret {
		newConfig.AddressBookSecret = oldConfig.AddressBookSecret
	}
}
