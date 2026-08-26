// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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
	"fmt"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
)

type Token struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	Application  string `xorm:"varchar(100)" json:"application"`
	Organization string `xorm:"varchar(100)" json:"organization"`
	User         string `xorm:"varchar(100)" json:"user"`

	Code             string `xorm:"varchar(100) index" json:"code"`
	CodeHash         string `xorm:"varchar(100) index" json:"codeHash"`
	AccessToken      string `xorm:"mediumtext" json:"accessToken"`
	RefreshToken     string `xorm:"mediumtext" json:"refreshToken"`
	AccessTokenHash  string `xorm:"varchar(100) index" json:"accessTokenHash"`
	RefreshTokenHash string `xorm:"varchar(100) index" json:"refreshTokenHash"`
	ExpiresIn        int    `json:"expiresIn"`
	Scope            string `xorm:"varchar(100)" json:"scope"`
	TokenType        string `xorm:"varchar(100)" json:"tokenType"`
	CodeChallenge    string `xorm:"varchar(100)" json:"codeChallenge"`
	CodeIsUsed       bool   `json:"codeIsUsed"`
	CodeExpireIn     int64  `json:"codeExpireIn"`
	Resource         string `xorm:"varchar(255)" json:"resource"` // RFC 8707 Resource Indicator
	RedirectUri      string `xorm:"varchar(1000)" json:"-"`
	Nonce            string `xorm:"varchar(255)" json:"-"`
	Provider         string `xorm:"varchar(100)" json:"-"`
	SigninMethod     string `xorm:"varchar(100)" json:"-"`

	// Issued* values only exist for the duration of the token response. Native
	// public clients persist hashes in the Token table, never raw credentials.
	IssuedAccessToken  string `xorm:"-" json:"-"`
	IssuedIdToken      string `xorm:"-" json:"-"`
	IssuedRefreshToken string `xorm:"-" json:"-"`
}

func GetTokenCount(owner, organization, field, value string) (int64, error) {
	session := GetSession(owner, -1, -1, field, value, "", "")
	return session.Count(&Token{Organization: organization})
}

func GetTokens(owner string, organization string) ([]*Token, error) {
	tokens := []*Token{}
	err := ormer.Engine.Desc("created_time").Find(&tokens, &Token{Owner: owner, Organization: organization})
	return tokens, err
}

func GetPaginationTokens(owner, organization string, offset, limit int, field, value, sortField, sortOrder string) ([]*Token, error) {
	tokens := []*Token{}
	session := GetSession(owner, offset, limit, field, value, sortField, sortOrder)
	err := session.Find(&tokens, &Token{Organization: organization})
	return tokens, err
}

func getToken(owner string, name string) (*Token, error) {
	if owner == "" || name == "" {
		return nil, nil
	}

	token := Token{Owner: owner, Name: name}
	existed, err := ormer.Engine.Get(&token)
	if err != nil {
		return nil, err
	}

	if existed {
		return &token, nil
	}

	return nil, nil
}

func getTokenByCode(code string) (*Token, error) {
	return getTokenByHashedOrLegacyCredential("code_hash", "code", code)
}

func GetTokenByAccessToken(accessToken string) (*Token, error) {
	return getTokenByHashedOrLegacyCredential("access_token_hash", "access_token", accessToken)
}

func GetTokenByRefreshToken(refreshToken string) (*Token, error) {
	return getTokenByHashedOrLegacyCredential("refresh_token_hash", "refresh_token", refreshToken)
}

// getTokenByHashedOrLegacyCredential implements the read-both phase of the
// token credential migration. Hash lookup is always preferred. A raw lookup
// exists only for pre-migration rows and immediately backfills the hash so the
// compatibility path converges instead of creating permanent raw-token debt.
func getTokenByHashedOrLegacyCredential(hashColumn string, rawColumn string, credential string) (*Token, error) {
	if ormer == nil || ormer.Engine == nil || credential == "" {
		return nil, nil
	}
	token := Token{}
	existed, err := ormer.Engine.Where(hashColumn+" = ?", getTokenHash(credential)).Get(&token)
	if err != nil {
		return nil, err
	}
	if existed {
		return &token, nil
	}

	token = Token{}
	existed, err = ormer.Engine.Where(rawColumn+" = ?", credential).Get(&token)
	if err != nil || !existed {
		return nil, err
	}
	if err = backfillTokenCredentialHashes(ormer.Engine, &token); err != nil {
		return nil, err
	}
	return &token, nil
}

func GetTokenByTokenValue(tokenValue, tokenTypeHint string) (*Token, error) {
	lookups := []func(string) (*Token, error){GetTokenByAccessToken, GetTokenByRefreshToken}
	if tokenTypeHint == "refresh_token" || tokenTypeHint == "refresh-token" {
		lookups[0], lookups[1] = lookups[1], lookups[0]
	}
	// RFC 7009 defines token_type_hint only as a lookup optimization. If the
	// hinted class misses, the other supported token classes must still be
	// checked.
	for _, lookup := range lookups {
		token, err := lookup(tokenValue)
		if err != nil {
			return nil, err
		}
		if token != nil {
			return token, nil
		}
	}

	return nil, nil
}

func consumeAuthorizationCode(token *Token) (bool, error) {
	if token == nil {
		return false, nil
	}

	query := ormer.Engine.ID(core.PK{token.Owner, token.Name}).Where("code_is_used = ?", false)
	if token.CodeHash != "" {
		query = query.And("code_hash = ?", token.CodeHash)
	} else {
		query = query.And("code = ?", token.Code)
	}

	token.CodeIsUsed = true
	affected, err := query.Cols(
		"code_is_used",
		"access_token",
		"refresh_token",
		"access_token_hash",
		"refresh_token_hash",
	).Update(token)
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func GetToken(id string) (*Token, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getToken(owner, name)
}

func (token *Token) GetId() string {
	return fmt.Sprintf("%s/%s", token.Owner, token.Name)
}

func getTokenHash(input string) string {
	hash := sha256.Sum256([]byte(input))
	res := hex.EncodeToString(hash[:])
	if len(res) > 64 {
		return res[:64]
	}
	return res
}

func (token *Token) popularHashes() {
	if token.CodeHash == "" && token.Code != "" {
		token.CodeHash = getTokenHash(token.Code)
	}
	if token.AccessTokenHash == "" && token.AccessToken != "" {
		token.AccessTokenHash = getTokenHash(token.AccessToken)
	}
	if token.RefreshTokenHash == "" && token.RefreshToken != "" {
		token.RefreshTokenHash = getTokenHash(token.RefreshToken)
	}
}

func (token *Token) accessTokenForResponse() string {
	if token != nil && token.IssuedAccessToken != "" {
		return token.IssuedAccessToken
	}
	if token == nil {
		return ""
	}
	return token.AccessToken
}

func (token *Token) idTokenForResponse() string {
	if token != nil && token.IssuedIdToken != "" {
		return token.IssuedIdToken
	}
	return token.accessTokenForResponse()
}

func (token *Token) refreshTokenForResponse() string {
	if token != nil && token.IssuedRefreshToken != "" {
		return token.IssuedRefreshToken
	}
	if token == nil {
		return ""
	}
	return token.RefreshToken
}

func UpdateToken(id string, token *Token, isGlobalAdmin bool) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	if t, err := getToken(owner, name); err != nil {
		return false, err
	} else if t == nil {
		return false, nil
	} else if !isGlobalAdmin && t.Organization != token.Organization {
		return false, nil
	}

	token.popularHashes()

	affected, err := ormer.Engine.ID(core.PK{owner, name}).AllCols().Update(token)
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func AddToken(token *Token) (bool, error) {
	token.popularHashes()

	affected, err := ormer.Engine.Insert(token)
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func DeleteToken(token *Token) (bool, error) {
	affected, err := ormer.Engine.ID(core.PK{token.Owner, token.Name}).Where("organization = ?", token.Organization).Delete(&Token{})
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

// rotateRefreshTokenAtomically implements single-winner refresh rotation. The
// conditional delete locks/consumes the presented refresh session inside the
// same transaction that inserts its replacement, so replay and concurrent
// losers cannot delete or invalidate the winner's new session.
func rotateRefreshTokenAtomically(oldToken *Token, newToken *Token, presentedRefreshToken string) (bool, error) {
	if oldToken == nil || newToken == nil || presentedRefreshToken == "" {
		return false, nil
	}

	newToken.popularHashes()
	session := ormer.Engine.NewSession()
	defer session.Close()
	if err := session.Begin(); err != nil {
		return false, err
	}
	rollback := true
	defer func() {
		if rollback {
			_ = session.Rollback()
		}
	}()

	affected, err := session.ID(core.PK{oldToken.Owner, oldToken.Name}).
		Where("refresh_token_hash = ?", getTokenHash(presentedRefreshToken)).
		Delete(&Token{})
	if err != nil {
		return false, err
	}
	if affected == 0 {
		return false, nil
	}

	affected, err = session.Insert(newToken)
	if err != nil {
		return false, err
	}
	if affected == 0 {
		return false, fmt.Errorf("failed to persist rotated refresh session")
	}
	if err := session.Commit(); err != nil {
		return false, err
	}
	rollback = false
	return true, nil
}

func ExpireTokenByUser(owner, username string) (bool, error) {
	affected, err := ormer.Engine.Where("organization = ? and user = ?", owner, username).Cols("expires_in").Update(&Token{ExpiresIn: 0})
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}
