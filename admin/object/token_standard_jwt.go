// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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
	"fmt"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/golang-jwt/jwt/v5"
)

type ClaimsStandard struct {
	*UserStandard
	EmailVerified       bool        `json:"email_verified,omitempty"`
	PhoneNumber         string      `json:"phone_number,omitempty"`
	PhoneNumberVerified bool        `json:"phone_number_verified,omitempty"`
	Gender              string      `json:"gender,omitempty"`
	TokenType           string      `json:"tokenType,omitempty"`
	Nonce               string      `json:"nonce,omitempty"`
	Scope               string      `json:"scope,omitempty"`
	Address             OIDCAddress `json:"address,omitempty"`
	Azp                 string      `json:"azp,omitempty"`
	ClientId            string      `json:"client_id,omitempty"`
	Organization        string      `json:"organization,omitempty"`
	Provider            string      `json:"provider,omitempty"`
	// WecomCanonicalId 是签名 id_token 中给下游绑定使用的企业微信强身份，不能替代稳定 admin subject。
	WecomCanonicalId string `json:"wecom_canonical_id,omitempty"`

	jwt.RegisteredClaims
}

func getStreetAddress(user *User) string {
	var addrs string
	for _, addr := range user.Address {
		addrs += addr + "\n"
	}
	return addrs
}

// getWecomCanonicalId 只从企业微信强身份字段生成 canonical claim，缺失字段或非企业微信登录时 fail closed。
func getWecomCanonicalId(claims Claims) string {
	if claims.User == nil || !isWecomLoginClaims(claims) {
		return ""
	}

	corpId := ""
	wecomUserId := strings.TrimSpace(claims.User.Wecom)
	if claims.User.Properties != nil {
		corpId = strings.TrimSpace(claims.User.Properties[WecomUserPropertyCorpId])
		if value := strings.TrimSpace(claims.User.Properties[WecomUserPropertyUserId]); value != "" {
			wecomUserId = value
		}
	}

	if corpId == "" || wecomUserId == "" {
		return ""
	}
	return fmt.Sprintf("wecom:%s:%s", corpId, wecomUserId)
}

// isWecomLoginClaims 优先信任显式 signinMethod，避免非企业微信登录仅靠 provider 字段伪造 claim。
func isWecomLoginClaims(claims Claims) bool {
	signinMethod := strings.TrimSpace(claims.SigninMethod)
	if signinMethod != "" {
		return strings.EqualFold(signinMethod, "wecom")
	}
	return strings.EqualFold(strings.TrimSpace(claims.Provider), "WeCom")
}

func getStandardClaims(claims Claims) ClaimsStandard {
	res := ClaimsStandard{
		UserStandard:     getStandardUser(claims.User),
		EmailVerified:    claims.User.EmailVerified,
		TokenType:        claims.TokenType,
		Nonce:            claims.Nonce,
		Scope:            claims.Scope,
		RegisteredClaims: claims.RegisteredClaims,
		Azp:              claims.Azp,
		ClientId:         claims.ClientId,
		Organization:     claims.Organization,
		Provider:         claims.Provider,
		WecomCanonicalId: getWecomCanonicalId(claims),
	}

	res.Phone = ""
	var scopes []string

	if strings.Contains(claims.Scope, ",") {
		scopes = strings.Split(claims.Scope, ",")
	} else {
		scopes = strings.Split(claims.Scope, " ")
	}

	for _, scope := range scopes {
		if scope == "address" {
			res.Address = OIDCAddress{StreetAddress: getStreetAddress(claims.User)}
		} else if scope == "profile" {
			res.Gender = claims.User.Gender
		} else if scope == "phone" && claims.User.Phone != "" {
			res.PhoneNumberVerified = true
			phoneNumber, ok := util.GetE164Number(claims.User.Phone, claims.User.CountryCode)
			if !ok {
				res.PhoneNumberVerified = false
			} else {
				res.PhoneNumber = phoneNumber
			}

		}
	}

	return res
}

func ParseStandardJwtToken(token string, cert *Cert) (*ClaimsStandard, error) {
	t, err := jwt.ParseWithClaims(token, &ClaimsStandard{}, func(token *jwt.Token) (interface{}, error) {
		var (
			certificate interface{}
			err         error
		)

		if cert.Certificate == "" {
			return nil, fmt.Errorf("the certificate field should not be empty for the cert: %v", cert)
		}

		if _, ok := token.Method.(*jwt.SigningMethodRSA); ok {
			// RSA certificate
			certificate, err = jwt.ParseRSAPublicKeyFromPEM([]byte(cert.Certificate))
		} else if _, ok := token.Method.(*jwt.SigningMethodECDSA); ok {
			// ES certificate
			certificate, err = jwt.ParseECPublicKeyFromPEM([]byte(cert.Certificate))
		} else {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		if err != nil {
			return nil, err
		}

		return certificate, nil
	})

	if t != nil {
		if claims, ok := t.Claims.(*ClaimsStandard); ok && t.Valid {
			return claims, nil
		}
	}

	return nil, err
}

func ParseStandardJwtTokenByApplication(token string, application *Application) (*ClaimsStandard, error) {
	cert, err := getCertByApplication(application)
	if err != nil {
		return nil, err
	}

	return ParseStandardJwtToken(token, cert)
}
