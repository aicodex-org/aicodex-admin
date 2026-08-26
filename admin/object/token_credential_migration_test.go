package object

import "testing"

func TestTokenCredentialMigrationBackfillsAndContractsNativeRows(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Token))
	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() { ormer = oldOrmer })

	legacy := &Token{
		Owner: "admin", Name: "legacy", Application: "legacy-app",
		Code: "legacy-code-value", AccessToken: "legacy-access-value", RefreshToken: "legacy-refresh-value",
	}
	native := &Token{
		Owner: "admin", Name: "native", Application: AICodexIOSApplicationName,
		Code: "native-code-value", AccessToken: "native-access-value", RefreshToken: "native-refresh-value",
	}
	if _, err := engine.Insert(legacy, native); err != nil {
		t.Fatalf("insert token fixtures: %v", err)
	}

	stats, err := migrateTokenCredentialStorage(engine)
	if err != nil {
		t.Fatalf("migrate token credential storage: %v", err)
	}
	if stats.RowsUpdated != 2 || stats.CodeHashesBackfilled != 2 || stats.AccessHashesBackfilled != 2 || stats.RefreshHashesBackfilled != 2 || stats.NativeRowsContracted != 1 {
		t.Fatalf("migration stats = %+v", stats)
	}

	loadedLegacy, err := getToken("admin", "legacy")
	if err != nil || loadedLegacy == nil {
		t.Fatalf("load legacy token: token=%#v err=%v", loadedLegacy, err)
	}
	if loadedLegacy.Code == "" || loadedLegacy.AccessToken == "" || loadedLegacy.RefreshToken == "" {
		t.Fatalf("legacy compatibility material was contracted early")
	}
	if loadedLegacy.CodeHash != getTokenHash(legacy.Code) || loadedLegacy.AccessTokenHash != getTokenHash(legacy.AccessToken) || loadedLegacy.RefreshTokenHash != getTokenHash(legacy.RefreshToken) {
		t.Fatalf("legacy hashes were not backfilled")
	}

	loadedNative, err := getToken("admin", "native")
	if err != nil || loadedNative == nil {
		t.Fatalf("load native token: token=%#v err=%v", loadedNative, err)
	}
	if loadedNative.Code != "" || loadedNative.AccessToken != "" || loadedNative.RefreshToken != "" {
		t.Fatalf("native plaintext contract failed")
	}
	if loadedNative.CodeHash != getTokenHash(native.Code) || loadedNative.AccessTokenHash != getTokenHash(native.AccessToken) || loadedNative.RefreshTokenHash != getTokenHash(native.RefreshToken) {
		t.Fatalf("native hashes were not preserved")
	}
	if byRefresh, lookupErr := GetTokenByRefreshToken(native.RefreshToken); lookupErr != nil || byRefresh == nil || byRefresh.Name != native.Name {
		t.Fatalf("native hash lookup failed: token=%#v err=%v", byRefresh, lookupErr)
	}
	if byCode, lookupErr := getTokenByCode(native.Code); lookupErr != nil || byCode == nil || byCode.Name != native.Name {
		t.Fatalf("native code hash lookup failed: token=%#v err=%v", byCode, lookupErr)
	}
	if byAccess, lookupErr := GetTokenByAccessToken(native.AccessToken); lookupErr != nil || byAccess == nil || byAccess.Name != native.Name {
		t.Fatalf("native access hash lookup failed: token=%#v err=%v", byAccess, lookupErr)
	}

	second, err := migrateTokenCredentialStorage(engine)
	if err != nil || second.RowsUpdated != 0 {
		t.Fatalf("migration is not idempotent: stats=%+v err=%v", second, err)
	}
}

func TestTokenCredentialReadBothLazilyBackfillsLegacyRow(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Token))
	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() { ormer = oldOrmer })

	token := &Token{
		Owner: "admin", Name: "late-legacy", Application: "legacy-app",
		Code: "late-legacy-code", AccessToken: "late-legacy-access", RefreshToken: "late-legacy-refresh",
	}
	if _, err := engine.Insert(token); err != nil {
		t.Fatalf("insert late legacy token: %v", err)
	}
	loaded, err := getTokenByCode(token.Code)
	if err != nil || loaded == nil || loaded.Name != token.Name {
		t.Fatalf("code read-both lookup failed: token=%#v err=%v", loaded, err)
	}
	reloaded, err := getToken(token.Owner, token.Name)
	if err != nil || reloaded == nil ||
		reloaded.CodeHash != getTokenHash(token.Code) ||
		reloaded.RefreshTokenHash != getTokenHash(token.RefreshToken) ||
		reloaded.AccessTokenHash != getTokenHash(token.AccessToken) {
		t.Fatalf("lazy hash backfill failed: token=%#v err=%v", reloaded, err)
	}

	if _, err = engine.Where("owner = ? AND name = ?", token.Owner, token.Name).
		Cols("code", "access_token", "refresh_token").Update(&Token{}); err != nil {
		t.Fatalf("contract raw compatibility values: %v", err)
	}
	if byCode, lookupErr := getTokenByCode(token.Code); lookupErr != nil || byCode == nil || byCode.Name != token.Name {
		t.Fatalf("code hash lookup after contract failed: token=%#v err=%v", byCode, lookupErr)
	}
	if byAccess, lookupErr := GetTokenByAccessToken(token.AccessToken); lookupErr != nil || byAccess == nil || byAccess.Name != token.Name {
		t.Fatalf("access hash lookup after contract failed: token=%#v err=%v", byAccess, lookupErr)
	}
	if byRefresh, lookupErr := GetTokenByRefreshToken(token.RefreshToken); lookupErr != nil || byRefresh == nil || byRefresh.Name != token.Name {
		t.Fatalf("refresh hash lookup after contract failed: token=%#v err=%v", byRefresh, lookupErr)
	}
}
