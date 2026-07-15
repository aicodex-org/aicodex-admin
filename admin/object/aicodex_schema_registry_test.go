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
	"reflect"
	"testing"
)

func TestAICodexOwnedSchemaRegistryCreatesAllSQLiteTables(t *testing.T) {
	models := aicodexOwnedSchemaModels()
	if len(models) != 39 {
		t.Fatalf("registry model count = %d, want 39", len(models))
	}

	engine := newSQLiteTestEngine(t)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("first registry migration: %v", err)
	}
	for _, model := range models {
		exists, err := engine.IsTableExist(model)
		if err != nil {
			t.Fatalf("check table for %T: %v", model, err)
		}
		if !exists {
			t.Fatalf("table for %T was not created", model)
		}
	}
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("repeated registry migration: %v", err)
	}
	historyCount, err := engine.Where("version > 0").Count(new(AicodexSchemaMigration))
	if err != nil {
		t.Fatalf("count migration history: %v", err)
	}
	if historyCount != 1 {
		t.Fatalf("migration history count = %d, want 1", historyCount)
	}
}

func TestAICodexOwnedSchemaRegistryReturnsFreshModels(t *testing.T) {
	first := aicodexOwnedSchemaModels()
	second := aicodexOwnedSchemaModels()
	if len(first) == 0 || len(first) != len(second) {
		t.Fatalf("registry lengths = %d/%d", len(first), len(second))
	}
	for i := range first {
		if reflect.ValueOf(first[i]).Pointer() == reflect.ValueOf(second[i]).Pointer() {
			t.Fatalf("registry model %d reused pointer %T", i, first[i])
		}
	}
}
