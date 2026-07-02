// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
)

// DingTalkOrganizationSyncRunStatus 表示钉钉同步 run 的生命周期状态。
type DingTalkOrganizationSyncRunStatus string

const (
	DingTalkOrganizationSyncRunStatusRunning   DingTalkOrganizationSyncRunStatus = "running"
	DingTalkOrganizationSyncRunStatusSucceeded DingTalkOrganizationSyncRunStatus = "succeeded"
	DingTalkOrganizationSyncRunStatusFailed    DingTalkOrganizationSyncRunStatus = "failed"
	DingTalkOrganizationSyncRunStatusPartial   DingTalkOrganizationSyncRunStatus = "partial"
)

// DingTalkOrganizationSyncRunStage 表示钉钉同步 run 当前执行阶段。
type DingTalkOrganizationSyncRunStage string

const (
	DingTalkOrganizationSyncRunStageFetching   DingTalkOrganizationSyncRunStage = "fetching"
	DingTalkOrganizationSyncRunStagePlanning   DingTalkOrganizationSyncRunStage = "planning"
	DingTalkOrganizationSyncRunStageApplying   DingTalkOrganizationSyncRunStage = "applying"
	DingTalkOrganizationSyncRunStageFinalizing DingTalkOrganizationSyncRunStage = "finalizing"
)

// DingTalkOrganizationSyncTriggerType 区分手动触发和调度触发的钉钉同步。
type DingTalkOrganizationSyncTriggerType string

const (
	DingTalkOrganizationSyncTriggerManual    DingTalkOrganizationSyncTriggerType = "manual"
	DingTalkOrganizationSyncTriggerScheduled DingTalkOrganizationSyncTriggerType = "scheduled"
)

const (
	DingTalkOrganizationSyncDefaultConfigName = "dingtalk-org-sync-config"
	DingTalkOrganizationSyncMaskedSecret      = "***"

	DingTalkDepartmentGroupType       = "dingtalk-department"
	DingTalkDepartmentGroupNamePrefix = "dingtalk-dept-"
	DingTalkUserNamePrefix            = "dingtalk-user-"
	DingTalkUserExternalIdMaxLength   = 100
)

// DingTalkOrganizationSyncConfig 保存目标组织的一套钉钉通讯录同步来源。
type DingTalkOrganizationSyncConfig struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization           string    `xorm:"varchar(100) index unique(dingtalk_sync_config_org_app)" json:"organization"`
	AppKey                 string    `xorm:"varchar(100) index unique(dingtalk_sync_config_org_app)" json:"appKey"`
	AppSecret              string    `xorm:"text" json:"appSecret"`
	IsEnabled              bool      `xorm:"bool index" json:"isEnabled"`
	SoftDisableMissingData bool      `xorm:"bool" json:"softDisableMissingData"`
	LastRunId              string    `xorm:"varchar(100) index" json:"lastRunId"`
	LastSyncedAt           time.Time `xorm:"timestampz" json:"lastSyncedAt"`

	// Schedule* 字段仅用于配置 API/页面读写，持久化来源是通用 OrganizationSyncSchedule 表。
	ScheduleEnabled  bool   `xorm:"-" json:"scheduleEnabled"`
	ScheduleCron     string `xorm:"-" json:"scheduleCron"`
	ScheduleTimezone string `xorm:"-" json:"scheduleTimezone"`

	// ScheduleLast* 字段展示最近一次调度派发摘要，不代表钉钉同步 run 的最终状态。
	ScheduleLastFireAt    time.Time `xorm:"-" json:"scheduleLastFireAt"`
	ScheduleLastRunId     string    `xorm:"-" json:"scheduleLastRunId"`
	ScheduleLastStatus    string    `xorm:"-" json:"scheduleLastStatus"`
	ScheduleLastErrorCode string    `xorm:"-" json:"scheduleLastErrorCode"`
	ScheduleLastErrorText string    `xorm:"-" json:"scheduleLastErrorText"`
}

// DingTalkOrganizationSyncRun 记录一次钉钉全量差异同步的租约、阶段、统计和安全错误摘要。
type DingTalkOrganizationSyncRun struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization   string                              `xorm:"varchar(100) index" json:"organization"`
	ConfigName     string                              `xorm:"varchar(100) index" json:"configName"`
	AppKey         string                              `xorm:"varchar(100) index" json:"appKey"`
	TriggerType    DingTalkOrganizationSyncTriggerType `xorm:"varchar(50)" json:"triggerType"`
	Actor          string                              `xorm:"varchar(100) index" json:"actor"`
	Status         DingTalkOrganizationSyncRunStatus   `xorm:"varchar(50) index" json:"status"`
	Stage          DingTalkOrganizationSyncRunStage    `xorm:"varchar(50)" json:"stage"`
	StartedAt      time.Time                           `xorm:"timestampz index" json:"startedAt"`
	FinishedAt     time.Time                           `xorm:"timestampz" json:"finishedAt"`
	HeartbeatAt    time.Time                           `xorm:"timestampz index" json:"heartbeatAt"`
	LeaseExpiresAt time.Time                           `xorm:"timestampz index" json:"leaseExpiresAt"`

	DepartmentFetchedCount        int    `xorm:"int" json:"departmentFetchedCount"`
	DepartmentCreatedCount        int    `xorm:"int" json:"departmentCreatedCount"`
	DepartmentUpdatedCount        int    `xorm:"int" json:"departmentUpdatedCount"`
	DepartmentDisabledCount       int    `xorm:"int" json:"departmentDisabledCount"`
	UserFetchedCount              int    `xorm:"int" json:"userFetchedCount"`
	UserCreatedCount              int    `xorm:"int" json:"userCreatedCount"`
	UserUpdatedCount              int    `xorm:"int" json:"userUpdatedCount"`
	UserDisabledCount             int    `xorm:"int" json:"userDisabledCount"`
	MembershipUpdatedCount        int    `xorm:"int" json:"membershipUpdatedCount"`
	MembershipDisabledCount       int    `xorm:"int" json:"membershipDisabledCount"`
	DepartmentLeaderUpdatedCount  int    `xorm:"int" json:"departmentLeaderUpdatedCount"`
	DepartmentLeaderDisabledCount int    `xorm:"int" json:"departmentLeaderDisabledCount"`
	DirectLeaderUpdatedCount      int    `xorm:"int" json:"directLeaderUpdatedCount"`
	DirectLeaderDisabledCount     int    `xorm:"int" json:"directLeaderDisabledCount"`
	ErrorCode                     string `xorm:"varchar(100)" json:"errorCode"`
	ErrorText                     string `xorm:"text" json:"errorText"`
}

// DingTalkDepartmentMapping 保存钉钉部门与本地 Group 的稳定映射和最近可见状态。
type DingTalkDepartmentMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization       string    `xorm:"varchar(100) index unique(dingtalk_dept_mapping_external)" json:"organization"`
	AppKey             string    `xorm:"varchar(100) index unique(dingtalk_dept_mapping_external)" json:"appKey"`
	DepartmentId       string    `xorm:"varchar(100) index unique(dingtalk_dept_mapping_external)" json:"departmentId"`
	GroupOwner         string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName          string    `xorm:"varchar(100) index" json:"groupName"`
	ParentDepartmentId string    `xorm:"varchar(100) index" json:"parentDepartmentId"`
	ParentGroupOwner   string    `xorm:"varchar(100) index" json:"parentGroupOwner"`
	ParentGroupName    string    `xorm:"varchar(100) index" json:"parentGroupName"`
	DisplayName        string    `xorm:"varchar(255)" json:"displayName"`
	Order              int       `xorm:"int" json:"order"`
	LeaderUserIdCache  string    `xorm:"varchar(255) index" json:"leaderUserIdCache"`
	IsEnabled          bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId  string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId      string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt       time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// DingTalkUserMapping 保存钉钉成员与本地 User 的稳定映射和生命周期状态。
type DingTalkUserMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(dingtalk_user_mapping_external)" json:"organization"`
	AppKey            string    `xorm:"varchar(100) index unique(dingtalk_user_mapping_external)" json:"appKey"`
	DingTalkUserId    string    `xorm:"varchar(255) index unique(dingtalk_user_mapping_external)" json:"dingTalkUserId"`
	UnionId           string    `xorm:"varchar(255) index" json:"unionId"`
	UserOwner         string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName          string    `xorm:"varchar(255) index" json:"userName"`
	ExternalId        string    `xorm:"varchar(500) index" json:"externalId"`
	MainDepartmentId  string    `xorm:"varchar(100) index" json:"mainDepartmentId"`
	Status            string    `xorm:"varchar(100) index" json:"status"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// DingTalkUserDepartment 保存钉钉来源的成员部门关系，不覆盖非钉钉来源群组。
type DingTalkUserDepartment struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(dingtalk_user_department_external)" json:"organization"`
	AppKey            string    `xorm:"varchar(100) index unique(dingtalk_user_department_external)" json:"appKey"`
	DingTalkUserId    string    `xorm:"varchar(255) index unique(dingtalk_user_department_external)" json:"dingTalkUserId"`
	DepartmentId      string    `xorm:"varchar(100) index unique(dingtalk_user_department_external)" json:"departmentId"`
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

// DingTalkDepartmentLeader 保存钉钉部门负责人关系，供后续组织关系查询。
type DingTalkDepartmentLeader struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization      string    `xorm:"varchar(100) index unique(dingtalk_department_leader_external)" json:"organization"`
	AppKey            string    `xorm:"varchar(100) index unique(dingtalk_department_leader_external)" json:"appKey"`
	DepartmentId      string    `xorm:"varchar(100) index unique(dingtalk_department_leader_external)" json:"departmentId"`
	DingTalkUserId    string    `xorm:"varchar(255) index unique(dingtalk_department_leader_external)" json:"dingTalkUserId"`
	GroupOwner        string    `xorm:"varchar(100) index" json:"groupOwner"`
	GroupName         string    `xorm:"varchar(100) index" json:"groupName"`
	UserOwner         string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName          string    `xorm:"varchar(255) index" json:"userName"`
	IsPrimary         bool      `xorm:"bool index" json:"isPrimary"`
	IsEnabled         bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId     string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt      time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// DingTalkUserDirectLeader 保存钉钉成员直属上级关系。
type DingTalkUserDirectLeader struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization         string    `xorm:"varchar(100) index unique(dingtalk_user_direct_leader_external)" json:"organization"`
	AppKey               string    `xorm:"varchar(100) index unique(dingtalk_user_direct_leader_external)" json:"appKey"`
	DingTalkUserId       string    `xorm:"varchar(255) index unique(dingtalk_user_direct_leader_external)" json:"dingTalkUserId"`
	LeaderDingTalkUserId string    `xorm:"varchar(255) index unique(dingtalk_user_direct_leader_external)" json:"leaderDingTalkUserId"`
	UserOwner            string    `xorm:"varchar(100) index" json:"userOwner"`
	UserName             string    `xorm:"varchar(255) index" json:"userName"`
	LeaderUserOwner      string    `xorm:"varchar(100) index" json:"leaderUserOwner"`
	LeaderUserName       string    `xorm:"varchar(255) index" json:"leaderUserName"`
	IsEnabled            bool      `xorm:"bool index" json:"isEnabled"`
	MissingSinceRunId    string    `xorm:"varchar(100) index" json:"missingSinceRunId"`
	LastSeenRunId        string    `xorm:"varchar(100) index" json:"lastSeenRunId"`
	LastSyncedAt         time.Time `xorm:"timestampz" json:"lastSyncedAt"`
}

// DingTalkOrganizationFullSnapshot 是一次钉钉通讯录拉取后的完整内部快照。
type DingTalkOrganizationFullSnapshot struct {
	Departments []DingTalkDepartmentSnapshot
	Users       []DingTalkUserSnapshot
}

// GetMaskedDingTalkOrganizationSyncConfig 返回可给 API/页面使用的配置副本，按需隐藏 AppSecret。
func GetMaskedDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig, isMaskEnabled bool) *DingTalkOrganizationSyncConfig {
	if config == nil {
		return nil
	}
	maskedConfig := *config
	if isMaskEnabled && maskedConfig.AppSecret != "" {
		maskedConfig.AppSecret = DingTalkOrganizationSyncMaskedSecret
	}
	return &maskedConfig
}

// ApplyDingTalkOrganizationSyncConfigSecretUpdate 在更新配置时保留 masked placeholder 对应的旧 secret。
func ApplyDingTalkOrganizationSyncConfigSecretUpdate(oldConfig *DingTalkOrganizationSyncConfig, newConfig *DingTalkOrganizationSyncConfig) {
	if oldConfig == nil || newConfig == nil {
		return
	}
	if newConfig.AppSecret == DingTalkOrganizationSyncMaskedSecret {
		newConfig.AppSecret = oldConfig.AppSecret
	}
}

// GetDingTalkDepartmentGroupName 生成钉钉部门对应本地 Group 的长度安全名称。
func GetDingTalkDepartmentGroupName(appKey string, departmentId string) string {
	return boundedDingTalkName(DingTalkDepartmentGroupNamePrefix, appKey+"-"+departmentId, 100)
}

// GetDingTalkUserName 生成钉钉成员对应本地 User 的长度安全名称。
func GetDingTalkUserName(appKey string, userId string) string {
	return boundedDingTalkName(DingTalkUserNamePrefix, userId, 255)
}

// GetDingTalkRelationshipName 生成钉钉关系表的稳定对象名。
func GetDingTalkRelationshipName(organization string, appKey string, relationshipType string, ids ...string) string {
	parts := append([]string{organization, appKey, relationshipType}, ids...)
	return "rel-" + shortDingTalkOrganizationSyncHash(parts...)
}

// GetFullDingTalkUserExternalId 生成带 provider 和 appKey 的完整外部用户身份。
func GetFullDingTalkUserExternalId(appKey string, userId string) string {
	appKey = strings.TrimSpace(appKey)
	userId = strings.TrimSpace(userId)
	if appKey == "" || userId == "" {
		return ""
	}
	return "dingtalk:" + appKey + ":" + userId
}

// GetLengthSafeDingTalkUserExternalId 在下游字段长度受限时返回可稳定复算的外部身份。
func GetLengthSafeDingTalkUserExternalId(appKey string, userId string) string {
	full := GetFullDingTalkUserExternalId(appKey, userId)
	if len(full) <= DingTalkUserExternalIdMaxLength {
		return full
	}
	return "dingtalk:" + shortDingTalkOrganizationSyncHash(appKey, userId)
}

func boundedDingTalkName(prefix string, value string, maxLength int) string {
	value = strings.TrimSpace(value)
	if value == "" {
		value = "unknown"
	}
	name := prefix + value
	if len(name) <= maxLength {
		return name
	}
	return prefix + shortDingTalkOrganizationSyncHash(value)
}

func shortDingTalkOrganizationSyncHash(values ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(values, "\x1f")))
	return hex.EncodeToString(sum[:])[:16]
}
