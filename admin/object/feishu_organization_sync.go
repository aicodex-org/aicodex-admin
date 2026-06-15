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

type FeishuOrganizationSyncRunStatus string

const (
	FeishuOrganizationSyncRunStatusRunning   FeishuOrganizationSyncRunStatus = "running"
	FeishuOrganizationSyncRunStatusSucceeded FeishuOrganizationSyncRunStatus = "succeeded"
	FeishuOrganizationSyncRunStatusFailed    FeishuOrganizationSyncRunStatus = "failed"
	FeishuOrganizationSyncRunStatusPartial   FeishuOrganizationSyncRunStatus = "partial"
)

type FeishuOrganizationSyncRunStage string

const (
	FeishuOrganizationSyncRunStageFetching   FeishuOrganizationSyncRunStage = "fetching"
	FeishuOrganizationSyncRunStagePlanning   FeishuOrganizationSyncRunStage = "planning"
	FeishuOrganizationSyncRunStageApplying   FeishuOrganizationSyncRunStage = "applying"
	FeishuOrganizationSyncRunStageFinalizing FeishuOrganizationSyncRunStage = "finalizing"
)

type FeishuOrganizationSyncTriggerType string

const (
	FeishuOrganizationSyncTriggerManual    FeishuOrganizationSyncTriggerType = "manual"
	FeishuOrganizationSyncTriggerScheduled FeishuOrganizationSyncTriggerType = "scheduled"
)

const (
	FeishuOrganizationSyncDefaultConfigName = "feishu-org-sync-config"
	FeishuOrganizationSyncMaskedSecret      = "***"

	FeishuEndpointModeDomestic = "feishu"
	FeishuEndpointModeOverseas = "lark"

	FeishuDepartmentGroupType       = "feishu-department"
	FeishuDepartmentGroupNamePrefix = "feishu-dept-"
	FeishuUserNamePrefix            = "feishu-user-"
	FeishuUserExternalIdMaxLength   = 100

	FeishuUserPropertyUserId       = "oauth_Lark_userId"
	FeishuUserPropertyOpenId       = "oauth_Lark_openId"
	FeishuUserPropertyUnionId      = "oauth_Lark_unionId"
	FeishuUserPropertyTenantKey    = "oauth_Lark_tenantKey"
	FeishuUserPropertyEndpointMode = "feishuEndpointMode"
	FeishuUserPropertyAppId        = "feishuAppId"
)

// FeishuOrganizationSyncConfig 保存目标组织的一套飞书/Lark 通讯录同步来源。
type FeishuOrganizationSyncConfig struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization           string    `xorm:"varchar(100) index unique(feishu_sync_config_org_app)" json:"organization"`
	AppId                  string    `xorm:"varchar(100) index unique(feishu_sync_config_org_app)" json:"appId"`
	AppSecret              string    `xorm:"text" json:"appSecret"`
	EndpointMode           string    `xorm:"varchar(50) index" json:"endpointMode"`
	TenantKey              string    `xorm:"varchar(255) index" json:"tenantKey"`
	IsEnabled              bool      `xorm:"bool index" json:"isEnabled"`
	SoftDisableMissingData bool      `xorm:"bool" json:"softDisableMissingData"`
	LastRunId              string    `xorm:"varchar(100) index" json:"lastRunId"`
	LastSyncedAt           time.Time `xorm:"timestampz" json:"lastSyncedAt"`

	ScheduleEnabled  bool   `xorm:"-" json:"scheduleEnabled"`
	ScheduleCron     string `xorm:"-" json:"scheduleCron"`
	ScheduleTimezone string `xorm:"-" json:"scheduleTimezone"`

	ScheduleLastFireAt    time.Time `xorm:"-" json:"scheduleLastFireAt"`
	ScheduleLastRunId     string    `xorm:"-" json:"scheduleLastRunId"`
	ScheduleLastStatus    string    `xorm:"-" json:"scheduleLastStatus"`
	ScheduleLastErrorCode string    `xorm:"-" json:"scheduleLastErrorCode"`
	ScheduleLastErrorText string    `xorm:"-" json:"scheduleLastErrorText"`
}

// FeishuOrganizationSyncRun 记录一次飞书组织架构同步执行。
type FeishuOrganizationSyncRun struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization   string                            `xorm:"varchar(100) index" json:"organization"`
	ConfigName     string                            `xorm:"varchar(100) index" json:"configName"`
	AppId          string                            `xorm:"varchar(100) index" json:"appId"`
	EndpointMode   string                            `xorm:"varchar(50) index" json:"endpointMode"`
	TenantKey      string                            `xorm:"varchar(255) index" json:"tenantKey"`
	TriggerType    FeishuOrganizationSyncTriggerType `xorm:"varchar(50)" json:"triggerType"`
	Actor          string                            `xorm:"varchar(100) index" json:"actor"`
	Status         FeishuOrganizationSyncRunStatus   `xorm:"varchar(50) index" json:"status"`
	Stage          FeishuOrganizationSyncRunStage    `xorm:"varchar(50)" json:"stage"`
	StartedAt      time.Time                         `xorm:"timestampz index" json:"startedAt"`
	FinishedAt     time.Time                         `xorm:"timestampz" json:"finishedAt"`
	HeartbeatAt    time.Time                         `xorm:"timestampz index" json:"heartbeatAt"`
	LeaseExpiresAt time.Time                         `xorm:"timestampz index" json:"leaseExpiresAt"`

	DepartmentFetchedCount  int    `xorm:"int" json:"departmentFetchedCount"`
	DepartmentCreatedCount  int    `xorm:"int" json:"departmentCreatedCount"`
	DepartmentUpdatedCount  int    `xorm:"int" json:"departmentUpdatedCount"`
	DepartmentDisabledCount int    `xorm:"int" json:"departmentDisabledCount"`
	UserFetchedCount        int    `xorm:"int" json:"userFetchedCount"`
	UserCreatedCount        int    `xorm:"int" json:"userCreatedCount"`
	UserUpdatedCount        int    `xorm:"int" json:"userUpdatedCount"`
	UserDisabledCount       int    `xorm:"int" json:"userDisabledCount"`
	MembershipUpdatedCount  int    `xorm:"int" json:"membershipUpdatedCount"`
	ErrorCode               string `xorm:"varchar(100)" json:"errorCode"`
	ErrorText               string `xorm:"text" json:"errorText"`
}

type FeishuDepartmentMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization       string    `xorm:"varchar(100) index unique(feishu_dept_mapping_external)" json:"organization"`
	AppId              string    `xorm:"varchar(100) index unique(feishu_dept_mapping_external)" json:"appId"`
	TenantKey          string    `xorm:"varchar(255) index" json:"tenantKey"`
	DepartmentId       string    `xorm:"varchar(255) index unique(feishu_dept_mapping_external)" json:"departmentId"`
	GroupOwner         string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName          string    `xorm:"varchar(100) index" json:"groupName"`
	ParentDepartmentId string    `xorm:"varchar(255) index" json:"parentDepartmentId"`
	ParentGroupOwner   string    `xorm:"varchar(100) index" json:"parentGroupOwner"`
	ParentGroupName    string    `xorm:"varchar(100) index" json:"parentGroupName"`
	DisplayName        string    `xorm:"varchar(255)" json:"displayName"`
	IsEnabled          bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId  string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId      string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt       time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

type FeishuUserMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(feishu_user_mapping_external)" json:"organization"`
	AppId             string    `xorm:"varchar(100) index unique(feishu_user_mapping_external)" json:"appId"`
	TenantKey         string    `xorm:"varchar(255) index" json:"tenantKey"`
	FeishuUserId      string    `xorm:"varchar(255) index unique(feishu_user_mapping_external)" json:"feishuUserId"`
	OpenId            string    `xorm:"varchar(255) index" json:"openId"`
	UnionId           string    `xorm:"varchar(255) index" json:"unionId"`
	UserOwner         string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName          string    `xorm:"varchar(255) index" json:"userName"`
	ExternalId        string    `xorm:"varchar(500) index" json:"externalId"`
	MainDepartmentId  string    `xorm:"varchar(255) index" json:"mainDepartmentId"`
	Status            string    `xorm:"varchar(100) index" json:"status"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

type FeishuUserDepartment struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(feishu_user_department_external)" json:"organization"`
	AppId             string    `xorm:"varchar(100) index unique(feishu_user_department_external)" json:"appId"`
	FeishuUserId      string    `xorm:"varchar(255) index unique(feishu_user_department_external)" json:"feishuUserId"`
	DepartmentId      string    `xorm:"varchar(255) index unique(feishu_user_department_external)" json:"departmentId"`
	UserOwner         string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName          string    `xorm:"varchar(255) index" json:"userName"`
	GroupOwner        string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName         string    `xorm:"varchar(100) index" json:"groupName"`
	IsMain            bool      `xorm:"bool index" json:"isMain"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

type FeishuDepartmentSnapshot struct {
	Id       string
	ParentId string
	Name     string
}

type FeishuUserSnapshot struct {
	UserId           string
	OpenId           string
	UnionId          string
	TenantKey        string
	Name             string
	Email            string
	Mobile           string
	Avatar           string
	Title            string
	Status           string
	Departments      []string
	MainDepartmentId string
}

type FeishuOrganizationFullSnapshot struct {
	Departments     []FeishuDepartmentSnapshot
	Users           []FeishuUserSnapshot
	UserDepartments []FeishuUserDepartmentSnapshot
}

type FeishuUserDepartmentSnapshot struct {
	FeishuUserId string
	DepartmentId string
	IsMain       bool
}

func GetFeishuDepartmentGroupName(sourceTenantId string, departmentId string) string {
	return FeishuDepartmentGroupNamePrefix + shortFeishuOrganizationSyncHash(sourceTenantId, departmentId)
}

func GetFeishuUserName(sourceTenantId string, userId string) string {
	return FeishuUserNamePrefix + shortFeishuOrganizationSyncHash(sourceTenantId, userId)
}

func GetFeishuRelationshipName(organization string, appId string, relationshipType string, ids ...string) string {
	parts := append([]string{organization, appId, relationshipType}, ids...)
	return "rel-" + shortFeishuOrganizationSyncHash(parts...)
}

func GetFullFeishuUserExternalId(sourceTenantId string, userId string) string {
	sourceTenantId = strings.TrimSpace(sourceTenantId)
	userId = strings.TrimSpace(userId)
	if sourceTenantId == "" || userId == "" {
		return ""
	}
	return "lark:" + sourceTenantId + ":" + userId
}

func GetLengthSafeFeishuUserExternalId(sourceTenantId string, userId string) string {
	full := GetFullFeishuUserExternalId(sourceTenantId, userId)
	if len(full) <= FeishuUserExternalIdMaxLength {
		return full
	}
	return "lark:" + shortFeishuOrganizationSyncHash(sourceTenantId, userId)
}

func GetMaskedFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig, isMaskEnabled bool) *FeishuOrganizationSyncConfig {
	if config == nil {
		return nil
	}
	masked := *config
	if isMaskEnabled && masked.AppSecret != "" {
		masked.AppSecret = FeishuOrganizationSyncMaskedSecret
	}
	return &masked
}

func ApplyFeishuOrganizationSyncConfigSecretUpdate(oldConfig *FeishuOrganizationSyncConfig, newConfig *FeishuOrganizationSyncConfig) {
	if oldConfig == nil || newConfig == nil {
		return
	}
	if newConfig.AppSecret == FeishuOrganizationSyncMaskedSecret {
		newConfig.AppSecret = oldConfig.AppSecret
	}
}

func normalizeFeishuEndpointMode(endpointMode string) string {
	switch strings.ToLower(strings.TrimSpace(endpointMode)) {
	case "", FeishuEndpointModeDomestic, "cn", "domestic":
		return FeishuEndpointModeDomestic
	case FeishuEndpointModeOverseas, "global", "overseas", "larksuite":
		return FeishuEndpointModeOverseas
	default:
		return strings.ToLower(strings.TrimSpace(endpointMode))
	}
}

func isValidFeishuEndpointMode(endpointMode string) bool {
	mode := normalizeFeishuEndpointMode(endpointMode)
	return mode == FeishuEndpointModeDomestic || mode == FeishuEndpointModeOverseas
}

func shortFeishuOrganizationSyncHash(values ...string) string {
	normalized := make([]string, len(values))
	for i, value := range values {
		normalized[i] = strings.TrimSpace(value)
	}
	sum := sha256.Sum256([]byte(strings.Join(normalized, "\x1f")))
	return hex.EncodeToString(sum[:])[:24]
}
