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
	"git.leagsoft.com/aicodex/aicodex-admin/email"
	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
)

type enterpriseCAPublicMaterial struct {
	Type        string `xorm:"type"`
	Certificate string `xorm:"certificate"`
}

// ResolveProviderTLSPolicy 为历史insecure的Provider解析连接级策略，且只查询CA公钥材料。
func ResolveProviderTLSPolicy(provider *Provider) (*tlspolicy.Resolution, error) {
	if provider == nil {
		return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeInvalidPolicy}
	}
	return resolveEnterpriseTLSPolicy(provider.Owner, provider.TlsPolicy, provider.Cert, tlspolicy.ModeLegacyInsecure)
}

// ResolveSyncerTLSPolicy 按LDAP端口保留升级前行为，并且只查询CA公钥材料。
func ResolveSyncerTLSPolicy(syncer *Syncer) (*tlspolicy.Resolution, error) {
	if syncer == nil {
		return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeInvalidPolicy}
	}
	legacyMode := tlspolicy.ModeSystem
	if syncer.Port == 636 {
		legacyMode = tlspolicy.ModeLegacyInsecure
	}
	return resolveEnterpriseTLSPolicy(syncer.Owner, syncer.TlsPolicy, syncer.Cert, legacyMode)
}

// ResolveSMTPProviderTLSPolicy 保留各SMTP类型升级前的严格或兼容行为。
func ResolveSMTPProviderTLSPolicy(provider *Provider) (*tlspolicy.Resolution, error) {
	if provider == nil {
		return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeInvalidPolicy}
	}
	legacyMode := tlspolicy.ModeSystem
	if provider.Type == "SUBMAIL" {
		legacyMode = tlspolicy.ModeLegacyInsecure
	}
	return resolveEnterpriseTLSPolicy(provider.Owner, provider.TlsPolicy, provider.Cert, legacyMode)
}

func validateProviderTLSPolicyForWrite(provider *Provider) error {
	if provider == nil {
		return &tlspolicy.Error{Code: tlspolicy.ErrorCodeInvalidPolicy}
	}
	if provider.Type == "ADFS" {
		_, err := ResolveProviderTLSPolicy(provider)
		return err
	}
	if provider.Category == "Email" && email.IsSMTPProviderType(provider.Type) {
		_, err := ResolveSMTPProviderTLSPolicy(provider)
		return err
	}
	return nil
}

func validateSyncerTLSPolicyForWrite(syncer *Syncer) error {
	if syncer == nil {
		return &tlspolicy.Error{Code: tlspolicy.ErrorCodeInvalidPolicy}
	}
	if syncer.Type != "Active Directory" {
		return nil
	}
	resolution, err := ResolveSyncerTLSPolicy(syncer)
	if err != nil {
		return err
	}
	// custom CA 只对 LDAPS 生效，已知明文端口冲突必须在持久化前拒绝。
	if resolution.Diagnostic.CustomCA && syncer.Port != 636 {
		return &tlspolicy.Error{Code: tlspolicy.ErrorCodeCAConflict}
	}
	return nil
}

func resolveEnterpriseTLSPolicy(owner string, policy string, certName string, legacyMode string) (*tlspolicy.Resolution, error) {
	// 存量空值必须保持旧行为；历史 Cert 字段不能被静默解释为新 custom CA。
	if policy == "" {
		return tlspolicy.ResolveWithLegacyMode("", nil, legacyMode)
	}
	if policy != tlspolicy.ModeCustomCA {
		if certName != "" {
			return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeCAConflict}
		}
		return tlspolicy.ResolveWithLegacyMode(policy, nil, legacyMode)
	}
	if certName == "" {
		return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeCARequired}
	}

	cert, err := getEnterpriseCAPublicMaterial(owner, certName)
	if err != nil || cert == nil || cert.Type != "SSL" || cert.Certificate == "" {
		return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeCAInvalid}
	}
	// 查询只投影公钥材料，避免私钥进入该连接的 TLS policy 解析边界。
	return tlspolicy.ResolveWithLegacyMode(policy, []byte(cert.Certificate), legacyMode)
}

func getEnterpriseCAPublicMaterial(owner string, name string) (*enterpriseCAPublicMaterial, error) {
	if owner == "" || name == "" {
		return nil, nil
	}

	material := &enterpriseCAPublicMaterial{}
	existed, err := ormer.Engine.Table(new(Cert)).
		Cols("type", "certificate").
		Where("owner = ? and name = ?", owner, name).
		Get(material)
	if err != nil {
		return nil, err
	}
	if existed {
		return material, nil
	}
	if owner != "admin" {
		return getEnterpriseCAPublicMaterial("admin", name)
	}
	return nil, nil
}
