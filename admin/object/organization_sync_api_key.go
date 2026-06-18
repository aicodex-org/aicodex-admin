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
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
)

const (
	OrganizationSyncApiKeyContextKey    = "organizationSyncApiKeyAuth"
	OrganizationSyncApiKeyPrefix        = "osak_"
	OrganizationSyncApiKeyStateActive   = "Active"
	OrganizationSyncApiKeyStateDisabled = "Disabled"
)

type OrganizationSyncApiKey struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`
	UpdatedTime string `xorm:"varchar(100)" json:"updatedTime"`
	DisplayName string `xorm:"varchar(100)" json:"displayName"`

	Organization string `xorm:"varchar(100) index" json:"organization"`
	KeyPrefix    string `xorm:"varchar(32) index" json:"keyPrefix"`
	KeyHash      string `xorm:"varchar(100) index" json:"-"`
	State        string `xorm:"varchar(100)" json:"state"`
	ExpireTime   string `xorm:"varchar(100)" json:"expireTime"`
	CreatedBy    string `xorm:"varchar(200)" json:"createdBy"`

	LastUsedTime      string `xorm:"varchar(100)" json:"lastUsedTime"`
	LastUsedIp        string `xorm:"varchar(100)" json:"lastUsedIp"`
	LastUsedUserAgent string `xorm:"varchar(300)" json:"lastUsedUserAgent"`
}

type OrganizationSyncApiKeyIssueResult struct {
	Key    *OrganizationSyncApiKey `json:"key"`
	Secret string                  `json:"secret"`
}

type OrganizationSyncApiKeyAuth struct {
	Owner        string
	Name         string
	Organization string
	KeyPrefix    string
}

type OrganizationSyncSnapshot struct {
	Organization *Organization                  `json:"organization"`
	Groups       []*OrganizationSyncExportGroup `json:"groups"`
	Applications []*Application                 `json:"applications"`
}

type OrganizationSyncGroupMemberReference struct {
	SourceUserId    string `json:"sourceUserId,omitempty"`
	AdminSubject    string `json:"adminSubject,omitempty"`
	WecomExternalId string `json:"wecomExternalId,omitempty"`
	WecomCorpId     string `json:"wecomCorpId,omitempty"`
	WecomUserId     string `json:"wecomUserId,omitempty"`
	DisplayName     string `json:"displayName,omitempty"`
}

type OrganizationSyncExportGroup struct {
	Owner        string                                 `json:"owner"`
	Name         string                                 `json:"name"`
	CreatedTime  string                                 `json:"createdTime"`
	UpdatedTime  string                                 `json:"updatedTime"`
	DisplayName  string                                 `json:"displayName"`
	Manager      string                                 `json:"manager"`
	ContactEmail string                                 `json:"contactEmail"`
	Type         string                                 `json:"type"`
	ParentId     string                                 `json:"parentId"`
	ParentName   string                                 `json:"parentName"`
	IsTopGroup   bool                                   `json:"isTopGroup"`
	Users        []OrganizationSyncGroupMemberReference `json:"users"`
	Title        string                                 `json:"title,omitempty"`
	Key          string                                 `json:"key,omitempty"`
	HaveChildren bool                                   `json:"haveChildren"`
	IsEnabled    bool                                   `json:"isEnabled"`
}

func GenerateOrganizationSyncApiKeySecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return OrganizationSyncApiKeyPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

func IsOrganizationSyncApiKeySecret(secret string) bool {
	return strings.HasPrefix(strings.TrimSpace(secret), OrganizationSyncApiKeyPrefix)
}

func GetOrganizationSyncApiKeyHash(secret string) string {
	hash := sha256.Sum256([]byte(strings.TrimSpace(secret)))
	return hex.EncodeToString(hash[:])
}

func getOrganizationSyncApiKeyPrefix(secret string) string {
	secret = strings.TrimSpace(secret)
	if len(secret) <= 16 {
		return secret
	}
	return secret[:16]
}

func normalizeOrganizationSyncApiKey(key *OrganizationSyncApiKey) {
	if key == nil {
		return
	}
	key.Owner = strings.TrimSpace(key.Owner)
	key.Name = strings.TrimSpace(key.Name)
	key.Organization = strings.TrimSpace(key.Organization)
	key.DisplayName = strings.TrimSpace(key.DisplayName)
	key.State = strings.TrimSpace(key.State)
	key.ExpireTime = strings.TrimSpace(key.ExpireTime)
	if key.Organization != "" {
		key.Owner = key.Organization
	}
	if key.State == "" {
		key.State = OrganizationSyncApiKeyStateActive
	}
}

func validateOrganizationSyncApiKeyTarget(organization string) error {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return errors.New("organization is required")
	}
	if organization == "built-in" {
		return errors.New("built-in organization cannot use organization sync api keys")
	}
	org, err := GetOrganization(util.GetId("admin", organization))
	if err != nil {
		return err
	}
	if org == nil {
		return fmt.Errorf("organization does not exist: %s", organization)
	}
	return nil
}

func (key *OrganizationSyncApiKey) GetId() string {
	return fmt.Sprintf("%s/%s", key.Owner, key.Name)
}

func (key *OrganizationSyncApiKey) IsExpiredAt(now time.Time) bool {
	if key == nil || strings.TrimSpace(key.ExpireTime) == "" {
		return false
	}
	expireTime, err := time.Parse(time.RFC3339, strings.TrimSpace(key.ExpireTime))
	if err != nil {
		return true
	}
	return !now.Before(expireTime)
}

func (key *OrganizationSyncApiKey) IsUsableAt(now time.Time) error {
	if key == nil {
		return errors.New("organization sync api key is invalid or expired")
	}
	if key.State != OrganizationSyncApiKeyStateActive {
		return errors.New("organization sync api key is disabled")
	}
	if key.IsExpiredAt(now) {
		return errors.New("organization sync api key is expired")
	}
	return nil
}

func GetOrganizationSyncApiKeys(organization string) ([]*OrganizationSyncApiKey, error) {
	keys := []*OrganizationSyncApiKey{}
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return keys, ormer.Engine.Desc("created_time").Find(&keys)
	}
	return keys, ormer.Engine.Desc("created_time").Find(&keys, &OrganizationSyncApiKey{Organization: organization})
}

func getOrganizationSyncApiKey(owner string, name string) (*OrganizationSyncApiKey, error) {
	if owner == "" || name == "" {
		return nil, nil
	}
	key := OrganizationSyncApiKey{Owner: owner, Name: name}
	existed, err := ormer.Engine.Get(&key)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return &key, nil
}

func GetOrganizationSyncApiKey(id string) (*OrganizationSyncApiKey, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getOrganizationSyncApiKey(owner, name)
}

func GetOrganizationSyncApiKeyBySecret(secret string) (*OrganizationSyncApiKey, error) {
	secret = strings.TrimSpace(secret)
	if !IsOrganizationSyncApiKeySecret(secret) {
		return nil, nil
	}
	key := OrganizationSyncApiKey{KeyHash: GetOrganizationSyncApiKeyHash(secret)}
	existed, err := ormer.Engine.Get(&key)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return &key, nil
}

func AddOrganizationSyncApiKey(key *OrganizationSyncApiKey, actor string) (*OrganizationSyncApiKeyIssueResult, error) {
	normalizeOrganizationSyncApiKey(key)
	if err := validateOrganizationSyncApiKeyTarget(key.Organization); err != nil {
		return nil, err
	}
	if key.Name == "" {
		key.Name = "sync-key-" + util.GenerateId()
	}
	if key.DisplayName == "" {
		key.DisplayName = "Organization Sync API Key"
	}
	now := util.GetCurrentTime()
	key.CreatedTime = now
	key.UpdatedTime = now
	key.CreatedBy = strings.TrimSpace(actor)

	secret, err := GenerateOrganizationSyncApiKeySecret()
	if err != nil {
		return nil, err
	}
	key.KeyPrefix = getOrganizationSyncApiKeyPrefix(secret)
	key.KeyHash = GetOrganizationSyncApiKeyHash(secret)

	if _, err = ormer.Engine.Insert(key); err != nil {
		return nil, err
	}
	return &OrganizationSyncApiKeyIssueResult{Key: key, Secret: secret}, nil
}

func RotateOrganizationSyncApiKey(id string) (*OrganizationSyncApiKeyIssueResult, error) {
	key, err := GetOrganizationSyncApiKey(id)
	if err != nil {
		return nil, err
	}
	if key == nil {
		return nil, fmt.Errorf("organization sync api key does not exist: %s", id)
	}
	if err = validateOrganizationSyncApiKeyTarget(key.Organization); err != nil {
		return nil, err
	}
	secret, err := GenerateOrganizationSyncApiKeySecret()
	if err != nil {
		return nil, err
	}
	key.KeyPrefix = getOrganizationSyncApiKeyPrefix(secret)
	key.KeyHash = GetOrganizationSyncApiKeyHash(secret)
	key.UpdatedTime = util.GetCurrentTime()
	_, err = ormer.Engine.ID(core.PK{key.Owner, key.Name}).Cols("key_prefix", "key_hash", "updated_time").Update(key)
	if err != nil {
		return nil, err
	}
	return &OrganizationSyncApiKeyIssueResult{Key: key, Secret: secret}, nil
}

func DisableOrganizationSyncApiKey(id string) (bool, error) {
	key, err := GetOrganizationSyncApiKey(id)
	if err != nil {
		return false, err
	}
	if key == nil {
		return false, nil
	}
	key.State = OrganizationSyncApiKeyStateDisabled
	key.UpdatedTime = util.GetCurrentTime()
	affected, err := ormer.Engine.ID(core.PK{key.Owner, key.Name}).Cols("state", "updated_time").Update(key)
	return affected != 0, err
}

func DeleteOrganizationSyncApiKey(key *OrganizationSyncApiKey) (bool, error) {
	normalizeOrganizationSyncApiKey(key)
	affected, err := ormer.Engine.ID(core.PK{key.Owner, key.Name}).Delete(&OrganizationSyncApiKey{})
	return affected != 0, err
}

func UpdateOrganizationSyncApiKeyUsage(key *OrganizationSyncApiKey, ip string, userAgent string) error {
	if key == nil {
		return nil
	}
	if len(userAgent) > 300 {
		userAgent = userAgent[:300]
	}
	update := &OrganizationSyncApiKey{
		LastUsedTime:      util.GetCurrentTime(),
		LastUsedIp:        strings.TrimSpace(ip),
		LastUsedUserAgent: strings.TrimSpace(userAgent),
	}
	_, err := ormer.Engine.ID(core.PK{key.Owner, key.Name}).Cols("last_used_time", "last_used_ip", "last_used_user_agent").Update(update)
	return err
}

func AuthenticateOrganizationSyncApiKey(secret string, ip string, userAgent string) (*OrganizationSyncApiKeyAuth, error) {
	key, err := GetOrganizationSyncApiKeyBySecret(secret)
	if err != nil {
		return nil, err
	}
	if err = key.IsUsableAt(time.Now()); err != nil {
		return nil, err
	}
	if err = UpdateOrganizationSyncApiKeyUsage(key, ip, userAgent); err != nil {
		return nil, err
	}
	return &OrganizationSyncApiKeyAuth{
		Owner:        key.Owner,
		Name:         key.Name,
		Organization: key.Organization,
		KeyPrefix:    key.KeyPrefix,
	}, nil
}

func GetOrganizationSyncSnapshot(organization string) (*OrganizationSyncSnapshot, error) {
	organization = strings.TrimSpace(organization)
	org, err := GetMaskedOrganization(GetOrganization(util.GetId("admin", organization)))
	if err != nil {
		return nil, err
	}
	if org == nil {
		return nil, fmt.Errorf("organization does not exist: %s", organization)
	}

	groups, err := GetGroups(organization)
	if err != nil {
		return nil, err
	}
	exportGroups, err := BuildOrganizationSyncExportGroups(organization, groups)
	if err != nil {
		return nil, err
	}
	applications, err := GetOrganizationApplications("admin", organization)
	if err != nil {
		return nil, err
	}

	return &OrganizationSyncSnapshot{
		Organization: org,
		Groups:       exportGroups,
		Applications: GetMaskedApplications(applications, ""),
	}, nil
}

func BuildOrganizationSyncExportGroups(organization string, groups []*Group) ([]*OrganizationSyncExportGroup, error) {
	memberRefsByGroup, err := buildOrganizationSyncGroupMemberReferences(organization, groups)
	if err != nil {
		return nil, err
	}
	exportGroups := make([]*OrganizationSyncExportGroup, 0, len(groups))
	for _, group := range groups {
		if group == nil {
			continue
		}
		users := memberRefsByGroup[strings.TrimSpace(group.Name)]
		if users == nil {
			users = []OrganizationSyncGroupMemberReference{}
		}
		exportGroups = append(exportGroups, &OrganizationSyncExportGroup{
			Owner:        group.Owner,
			Name:         group.Name,
			CreatedTime:  group.CreatedTime,
			UpdatedTime:  group.UpdatedTime,
			DisplayName:  group.DisplayName,
			Manager:      group.Manager,
			ContactEmail: group.ContactEmail,
			Type:         group.Type,
			ParentId:     group.ParentId,
			ParentName:   group.ParentName,
			IsTopGroup:   group.IsTopGroup,
			Users:        users,
			Title:        group.Title,
			Key:          group.Key,
			HaveChildren: group.HaveChildren,
			IsEnabled:    group.IsEnabled,
		})
	}
	return exportGroups, nil
}

func buildOrganizationSyncGroupMemberReferences(organization string, groups []*Group) (map[string][]OrganizationSyncGroupMemberReference, error) {
	result := map[string][]OrganizationSyncGroupMemberReference{}
	organization = strings.TrimSpace(organization)
	if organization == "" || len(groups) == 0 {
		return result, nil
	}

	groupNameByDepartmentId := buildOrganizationSyncGroupDepartmentIndex(groups)
	departments, err := GetPlatformDepartments(organization)
	if err != nil {
		return nil, err
	}
	activeDepartmentToGroup := map[string]string{}
	for _, department := range departments {
		if department == nil || !isOrganizationSyncActiveStatus(department.LifecycleStatus) {
			continue
		}
		departmentId := strings.TrimSpace(department.DepartmentId)
		groupName := groupNameByDepartmentId[departmentId]
		if departmentId == "" || groupName == "" {
			continue
		}
		activeDepartmentToGroup[departmentId] = groupName
	}
	if len(activeDepartmentToGroup) == 0 {
		return result, nil
	}

	users, err := GetPlatformUsers(organization)
	if err != nil {
		return nil, err
	}
	activeUsersBySubject := map[string]*PlatformUser{}
	for _, user := range users {
		if user == nil || !isOrganizationSyncActiveStatus(user.LifecycleStatus) || !isOrganizationSyncConfirmedStatus(user.MappingStatus) {
			continue
		}
		adminSubject := strings.TrimSpace(user.AdminSubject)
		if adminSubject == "" {
			continue
		}
		activeUsersBySubject[adminSubject] = user
	}
	if len(activeUsersBySubject) == 0 {
		return result, nil
	}

	sourceConnections, err := GetSourceConnections(organization)
	if err != nil {
		return nil, err
	}
	sourceConnectionsById := map[string]*SourceConnection{}
	for _, connection := range sourceConnections {
		if connection == nil || !isOrganizationSyncActiveStatus(connection.Status) {
			continue
		}
		sourceConnectionId := strings.TrimSpace(connection.SourceConnectionId)
		if sourceConnectionId == "" {
			continue
		}
		sourceConnectionsById[sourceConnectionId] = connection
	}

	externalIdentities, err := GetExternalIdentities(organization)
	if err != nil {
		return nil, err
	}
	externalBySubject := buildOrganizationSyncExternalIdentityIndex(externalIdentities, sourceConnectionsById)

	memberships, err := GetPlatformMemberships(organization)
	if err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	for _, membership := range memberships {
		if membership == nil || !isOrganizationSyncActiveStatus(membership.LifecycleStatus) {
			continue
		}
		groupName := activeDepartmentToGroup[strings.TrimSpace(membership.DepartmentId)]
		if groupName == "" {
			continue
		}
		adminSubject := strings.TrimSpace(membership.AdminSubject)
		user := activeUsersBySubject[adminSubject]
		if adminSubject == "" || user == nil {
			continue
		}
		memberRef := OrganizationSyncGroupMemberReference{
			SourceUserId: strings.TrimSpace(adminSubject),
			AdminSubject: strings.TrimSpace(adminSubject),
			DisplayName:  firstNonEmpty(user.DisplayName, user.UserName),
		}
		if externalRef, ok := selectOrganizationSyncExternalIdentityRef(externalBySubject[adminSubject], membership.SourceConnectionId); ok {
			memberRef.WecomExternalId = externalRef.WecomExternalId
			memberRef.WecomCorpId = externalRef.WecomCorpId
			memberRef.WecomUserId = externalRef.WecomUserId
		}
		dedupeKey := groupName + "\x1f" + firstNonEmpty(memberRef.AdminSubject, memberRef.WecomExternalId, memberRef.WecomCorpId+":"+memberRef.WecomUserId)
		if seen[dedupeKey] {
			continue
		}
		seen[dedupeKey] = true
		result[groupName] = append(result[groupName], memberRef)
	}
	for groupName := range result {
		sort.Slice(result[groupName], func(i, j int) bool {
			return organizationSyncMemberReferenceSortKey(result[groupName][i]) < organizationSyncMemberReferenceSortKey(result[groupName][j])
		})
	}
	return result, nil
}

func buildOrganizationSyncGroupDepartmentIndex(groups []*Group) map[string]string {
	index := map[string]string{}
	for _, group := range groups {
		if group == nil {
			continue
		}
		groupName := strings.TrimSpace(group.Name)
		if groupName == "" {
			continue
		}
		index[groupName] = groupName
		if groupId := strings.TrimSpace(group.GetId()); groupId != "" {
			index[groupId] = groupName
		}
		if localId := getWecomLocalId(group.Owner, group.Name); localId != "" {
			index[localId] = groupName
		}
	}
	return index
}

type organizationSyncExternalIdentityRef struct {
	SourceConnectionId string
	WecomExternalId    string
	WecomCorpId        string
	WecomUserId        string
}

func buildOrganizationSyncExternalIdentityIndex(identities []*ExternalIdentity, sourceConnectionsById map[string]*SourceConnection) map[string][]organizationSyncExternalIdentityRef {
	result := map[string][]organizationSyncExternalIdentityRef{}
	for _, identity := range identities {
		if identity == nil || !isOrganizationSyncConfirmedStatus(identity.MappingStatus) {
			continue
		}
		if strings.TrimSpace(identity.ExternalSubjectType) != PlatformSubjectTypeUser || strings.TrimSpace(identity.PlatformSubjectType) != PlatformSubjectTypeUser {
			continue
		}
		adminSubject := strings.TrimSpace(identity.PlatformSubject)
		sourceConnectionId := strings.TrimSpace(identity.SourceConnectionId)
		externalSubjectId := strings.TrimSpace(identity.ExternalSubjectId)
		if adminSubject == "" || sourceConnectionId == "" || externalSubjectId == "" {
			continue
		}
		connection := sourceConnectionsById[sourceConnectionId]
		if connection == nil || strings.TrimSpace(connection.SourceType) != SourceTypeWecom {
			continue
		}
		corpId := strings.TrimSpace(connection.SourceTenantId)
		if corpId == "" {
			continue
		}
		result[adminSubject] = append(result[adminSubject], organizationSyncExternalIdentityRef{
			SourceConnectionId: sourceConnectionId,
			WecomExternalId:    "wecom:" + corpId + ":" + externalSubjectId,
			WecomCorpId:        corpId,
			WecomUserId:        externalSubjectId,
		})
	}
	for adminSubject := range result {
		sort.Slice(result[adminSubject], func(i, j int) bool {
			if result[adminSubject][i].SourceConnectionId != result[adminSubject][j].SourceConnectionId {
				return result[adminSubject][i].SourceConnectionId < result[adminSubject][j].SourceConnectionId
			}
			return result[adminSubject][i].WecomExternalId < result[adminSubject][j].WecomExternalId
		})
	}
	return result
}

func selectOrganizationSyncExternalIdentityRef(refs []organizationSyncExternalIdentityRef, sourceConnectionId string) (organizationSyncExternalIdentityRef, bool) {
	sourceConnectionId = strings.TrimSpace(sourceConnectionId)
	for _, ref := range refs {
		if sourceConnectionId != "" && ref.SourceConnectionId == sourceConnectionId {
			return ref, true
		}
	}
	if len(refs) == 0 {
		return organizationSyncExternalIdentityRef{}, false
	}
	return refs[0], true
}

func isOrganizationSyncActiveStatus(status string) bool {
	return strings.TrimSpace(status) == PlatformLifecycleStatusActive || strings.TrimSpace(status) == SourceConnectionStatusActive
}

func isOrganizationSyncConfirmedStatus(status string) bool {
	return strings.TrimSpace(status) == PlatformMappingStatusConfirmed
}

func organizationSyncMemberReferenceSortKey(ref OrganizationSyncGroupMemberReference) string {
	return firstNonEmpty(ref.AdminSubject, ref.WecomExternalId, ref.WecomCorpId+":"+ref.WecomUserId, ref.SourceUserId, ref.DisplayName)
}
