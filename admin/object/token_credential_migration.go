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
	"errors"

	"github.com/xorm-io/core"
	"github.com/xorm-io/xorm"
)

const tokenCredentialMigrationBatchSize = 500

type tokenCredentialMigrationStats struct {
	RowsUpdated             int64
	CodeHashesBackfilled    int64
	AccessHashesBackfilled  int64
	RefreshHashesBackfilled int64
	NativeRowsContracted    int64
}

// migrateTokenCredentialStorage advances the legacy Token table through the
// non-destructive credential migration phases:
//
//  1. Sync2 expands the hash columns before this function is called.
//  2. Every historical raw credential receives a deterministic lookup hash.
//  3. Runtime reads prefer hashes and retain a temporary raw fallback.
//  4. aicodex-ios rows contract immediately because that public client has
//     never depended on database plaintext for a later response.
//
// Other applications keep plaintext during their compatibility window. They
// can be contracted by a separate rollout only after their issuance paths no
// longer require stored response material.
func migrateTokenCredentialStorage(engine *xorm.Engine) (tokenCredentialMigrationStats, error) {
	stats := tokenCredentialMigrationStats{}
	if engine == nil {
		return stats, errors.New("token credential migration engine is required")
	}

	for {
		rows := make([]Token, 0, tokenCredentialMigrationBatchSize)
		err := engine.Where(`
			(COALESCE(code, '') <> '' AND COALESCE(code_hash, '') = '') OR
			(COALESCE(access_token, '') <> '' AND COALESCE(access_token_hash, '') = '') OR
			(COALESCE(refresh_token, '') <> '' AND COALESCE(refresh_token_hash, '') = '') OR
			(application = ? AND (
				COALESCE(code, '') <> '' OR COALESCE(access_token, '') <> '' OR COALESCE(refresh_token, '') <> ''
			))`, AICodexIOSApplicationName).
			Limit(tokenCredentialMigrationBatchSize).
			Find(&rows)
		if err != nil {
			return stats, err
		}
		if len(rows) == 0 {
			return stats, nil
		}

		session := engine.NewSession()
		if err = session.Begin(); err != nil {
			session.Close()
			return stats, err
		}
		batchStats := tokenCredentialMigrationStats{}
		for index := range rows {
			rowStats, updateErr := migrateTokenCredentialRow(session, &rows[index])
			if updateErr != nil {
				_ = session.Rollback()
				session.Close()
				return stats, updateErr
			}
			batchStats.RowsUpdated += rowStats.RowsUpdated
			batchStats.CodeHashesBackfilled += rowStats.CodeHashesBackfilled
			batchStats.AccessHashesBackfilled += rowStats.AccessHashesBackfilled
			batchStats.RefreshHashesBackfilled += rowStats.RefreshHashesBackfilled
			batchStats.NativeRowsContracted += rowStats.NativeRowsContracted
		}
		if err = session.Commit(); err != nil {
			session.Close()
			return stats, err
		}
		session.Close()
		stats.RowsUpdated += batchStats.RowsUpdated
		stats.CodeHashesBackfilled += batchStats.CodeHashesBackfilled
		stats.AccessHashesBackfilled += batchStats.AccessHashesBackfilled
		stats.RefreshHashesBackfilled += batchStats.RefreshHashesBackfilled
		stats.NativeRowsContracted += batchStats.NativeRowsContracted
	}
}

func migrateTokenCredentialRow(session *xorm.Session, token *Token) (tokenCredentialMigrationStats, error) {
	stats := tokenCredentialMigrationStats{}
	if session == nil || token == nil {
		return stats, errors.New("token credential migration row is invalid")
	}

	update := &Token{}
	columns := make([]string, 0, 6)
	if token.CodeHash == "" && token.Code != "" {
		token.CodeHash = getTokenHash(token.Code)
		update.CodeHash = token.CodeHash
		columns = append(columns, "code_hash")
		stats.CodeHashesBackfilled = 1
	}
	if token.AccessTokenHash == "" && token.AccessToken != "" {
		token.AccessTokenHash = getTokenHash(token.AccessToken)
		update.AccessTokenHash = token.AccessTokenHash
		columns = append(columns, "access_token_hash")
		stats.AccessHashesBackfilled = 1
	}
	if token.RefreshTokenHash == "" && token.RefreshToken != "" {
		token.RefreshTokenHash = getTokenHash(token.RefreshToken)
		update.RefreshTokenHash = token.RefreshTokenHash
		columns = append(columns, "refresh_token_hash")
		stats.RefreshHashesBackfilled = 1
	}

	if token.Application == AICodexIOSApplicationName {
		contracted := false
		if token.Code != "" && token.CodeHash != "" {
			update.Code = ""
			columns = append(columns, "code")
			contracted = true
		}
		if token.AccessToken != "" && token.AccessTokenHash != "" {
			update.AccessToken = ""
			columns = append(columns, "access_token")
			contracted = true
		}
		if token.RefreshToken != "" && token.RefreshTokenHash != "" {
			update.RefreshToken = ""
			columns = append(columns, "refresh_token")
			contracted = true
		}
		if contracted {
			stats.NativeRowsContracted = 1
		}
	}
	if len(columns) == 0 {
		return stats, nil
	}
	affected, err := session.ID(core.PK{token.Owner, token.Name}).Cols(columns...).Update(update)
	if err != nil {
		return tokenCredentialMigrationStats{}, err
	}
	stats.RowsUpdated = affected
	return stats, nil
}

// backfillTokenCredentialHashes is used by the raw read-both fallback for a
// row inserted after startup migration. It never clears compatibility fields;
// contraction remains a startup migration decision with a complete row view.
func backfillTokenCredentialHashes(engine *xorm.Engine, token *Token) error {
	if engine == nil || token == nil {
		return errors.New("token credential hash backfill input is invalid")
	}
	update := &Token{}
	columns := make([]string, 0, 3)
	if token.CodeHash == "" && token.Code != "" {
		token.CodeHash = getTokenHash(token.Code)
		update.CodeHash = token.CodeHash
		columns = append(columns, "code_hash")
	}
	if token.AccessTokenHash == "" && token.AccessToken != "" {
		token.AccessTokenHash = getTokenHash(token.AccessToken)
		update.AccessTokenHash = token.AccessTokenHash
		columns = append(columns, "access_token_hash")
	}
	if token.RefreshTokenHash == "" && token.RefreshToken != "" {
		token.RefreshTokenHash = getTokenHash(token.RefreshToken)
		update.RefreshTokenHash = token.RefreshTokenHash
		columns = append(columns, "refresh_token_hash")
	}
	if len(columns) == 0 {
		return nil
	}
	_, err := engine.ID(core.PK{token.Owner, token.Name}).Cols(columns...).Update(update)
	return err
}
