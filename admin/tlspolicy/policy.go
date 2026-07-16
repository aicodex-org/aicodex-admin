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

// Package tlspolicy 解析企业身份与邮件集成共用的连接级TLS信任契约。
package tlspolicy

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
)

const (
	ModeSystem         = "system"
	ModeCustomCA       = "custom-ca"
	ModeLegacyInsecure = "legacy-insecure"

	SourceExplicit         = "explicit"
	SourceLegacyUnmigrated = "legacy_unmigrated"

	ErrorCodeInvalidPolicy        = "invalid_policy"
	ErrorCodeCARequired           = "ca_required"
	ErrorCodeCAConflict           = "ca_conflict"
	ErrorCodeCAInvalid            = "ca_invalid"
	ErrorCodeSystemRoots          = "system_roots_unavailable"
	ErrorCodeTransportUnsupported = "transport_unsupported"
)

// Error 只暴露稳定分类，不保留不安全的原始输入或底层解析错误。
type Error struct {
	Code string
}

func (e *Error) Error() string {
	return "enterprise TLS policy: " + e.Code
}

// Diagnostic 可安全复制，且不包含目标或证书材料。
type Diagnostic struct {
	Mode     string
	Source   string
	CustomCA bool
}

// Resolution 持有仅属于当前连接的可变TLS状态。
type Resolution struct {
	TLSConfig  *tls.Config
	Diagnostic Diagnostic
}

// NormalizeForAdd 把新建记录省略的策略规范化为严格系统信任。
func NormalizeForAdd(policy string) (string, error) {
	if policy == "" {
		return ModeSystem, nil
	}
	return normalizeExplicit(policy)
}

// NormalizeForUpdate 在旧客户端省略字段时保留已持久化的迁移世代。
func NormalizeForUpdate(requested string, stored string) (string, error) {
	if requested == "" {
		if stored == "" {
			return "", nil
		}
		return normalizeExplicit(stored)
	}
	return normalizeExplicit(requested)
}

// ResolveWithLegacyMode 仅在存量空策略时应用调用方给出的历史等价模式。
func ResolveWithLegacyMode(policy string, caPEM []byte, legacyMode string) (*Resolution, error) {
	if policy == "" {
		if legacyMode != ModeSystem && legacyMode != ModeLegacyInsecure {
			return nil, &Error{Code: ErrorCodeInvalidPolicy}
		}
		return &Resolution{
			TLSConfig: &tls.Config{InsecureSkipVerify: legacyMode == ModeLegacyInsecure},
			Diagnostic: Diagnostic{
				Mode:   legacyMode,
				Source: SourceLegacyUnmigrated,
			},
		}, nil
	}

	mode, err := normalizeExplicit(policy)
	if err != nil {
		return nil, err
	}
	if mode != ModeCustomCA && len(caPEM) != 0 {
		return nil, &Error{Code: ErrorCodeCAConflict}
	}

	switch mode {
	case ModeSystem:
		return &Resolution{
			TLSConfig: &tls.Config{},
			Diagnostic: Diagnostic{
				Mode:   ModeSystem,
				Source: SourceExplicit,
			},
		}, nil
	case ModeLegacyInsecure:
		return &Resolution{
			TLSConfig: &tls.Config{InsecureSkipVerify: true},
			Diagnostic: Diagnostic{
				Mode:   ModeLegacyInsecure,
				Source: SourceExplicit,
			},
		}, nil
	case ModeCustomCA:
		if len(caPEM) == 0 {
			return nil, &Error{Code: ErrorCodeCARequired}
		}
		if !validCAPEM(caPEM) {
			return nil, &Error{Code: ErrorCodeCAInvalid}
		}
		roots, err := x509.SystemCertPool()
		if err != nil || roots == nil {
			return nil, &Error{Code: ErrorCodeSystemRoots}
		}
		if !roots.AppendCertsFromPEM(caPEM) {
			return nil, &Error{Code: ErrorCodeCAInvalid}
		}
		return &Resolution{
			TLSConfig: &tls.Config{RootCAs: roots},
			Diagnostic: Diagnostic{
				Mode:     ModeCustomCA,
				Source:   SourceExplicit,
				CustomCA: true,
			},
		}, nil
	default:
		return nil, &Error{Code: ErrorCodeInvalidPolicy}
	}
}

func normalizeExplicit(policy string) (string, error) {
	switch policy {
	case ModeSystem, ModeCustomCA, ModeLegacyInsecure:
		return policy, nil
	default:
		return "", &Error{Code: ErrorCodeInvalidPolicy}
	}
}

func validCAPEM(caPEM []byte) bool {
	remaining := bytes.TrimSpace(caPEM)
	count := 0
	for len(remaining) != 0 {
		if !bytes.HasPrefix(remaining, []byte("-----BEGIN CERTIFICATE-----")) {
			return false
		}
		block, rest := pem.Decode(remaining)
		if block == nil || block.Type != "CERTIFICATE" {
			return false
		}
		certificate, err := x509.ParseCertificate(block.Bytes)
		if err != nil || !certificate.IsCA || certificate.KeyUsage&x509.KeyUsageCertSign == 0 {
			return false
		}
		count++
		remaining = bytes.TrimSpace(rest)
	}
	return count != 0
}
