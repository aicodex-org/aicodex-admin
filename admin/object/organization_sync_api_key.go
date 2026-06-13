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
	Organization *Organization  `json:"organization"`
	Groups       []*Group       `json:"groups"`
	Applications []*Application `json:"applications"`
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
	applications, err := GetOrganizationApplications("admin", organization)
	if err != nil {
		return nil, err
	}

	return &OrganizationSyncSnapshot{
		Organization: org,
		Groups:       groups,
		Applications: GetMaskedApplications(applications, ""),
	}, nil
}
