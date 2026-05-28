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
	"strings"
	"testing"
)

func TestEnsurePostgresDataSourceNameUsesUTCTimeZone(t *testing.T) {
	dataSourceName := "user=postgres password=secret host=localhost port=5432 sslmode=disable dbname=aicodex_admin"

	got := ensurePostgresDataSourceNameUsesUTCTimeZone(dataSourceName)

	if !strings.Contains(got, "timezone=UTC") {
		t.Fatalf("dataSourceName = %q, want timezone=UTC", got)
	}
}

func TestEnsurePostgresDataSourceNameUsesUTCTimeZonePreservesExistingSetting(t *testing.T) {
	dataSourceName := "user=postgres dbname=aicodex_admin timezone=Asia/Shanghai"

	got := ensurePostgresDataSourceNameUsesUTCTimeZone(dataSourceName)

	if got != dataSourceName {
		t.Fatalf("dataSourceName = %q, want original %q", got, dataSourceName)
	}
}

func TestRefineDataSourceNameForPostgresPreservesFollowingOptions(t *testing.T) {
	dataSourceName := "user=postgres dbname=aicodex_admin timezone=UTC sslmode=disable"

	got := refineDataSourceNameForPostgres(dataSourceName)

	if got != "user=postgres dbname=postgres timezone=UTC sslmode=disable" {
		t.Fatalf("dataSourceName = %q", got)
	}
}
