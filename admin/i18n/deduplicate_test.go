// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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

package i18n

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// DuplicateInfo 描述一个重复的 namespace:key。
type DuplicateInfo struct {
	Key          string
	OldPrefix    string
	NewPrefix    string
	OldPrefixKey string // e.g., "general:Submitter"
	NewPrefixKey string // e.g., "permission:Submitter"
}

// findDuplicateKeysInJSON 在保留 JSON token 顺序的同时查找重复 namespace:key。
func findDuplicateKeysInJSON(filePath string) ([]DuplicateInfo, error) {
	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", filePath, err)
	}

	seenKeys := make(map[string]struct{})
	var duplicates []DuplicateInfo
	decoder := json.NewDecoder(bytes.NewReader(fileContent))

	token, err := decoder.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to read token: %w", err)
	}
	if delim, ok := token.(json.Delim); !ok || delim != '{' {
		return nil, fmt.Errorf("expected object start, got %v", token)
	}

	for decoder.More() {
		token, err := decoder.Token()
		if err != nil {
			return nil, fmt.Errorf("failed to read namespace: %w", err)
		}

		prefix, ok := token.(string)
		if !ok {
			return nil, fmt.Errorf("expected string namespace, got %v", token)
		}

		token, err = decoder.Token()
		if err != nil {
			return nil, fmt.Errorf("failed to read namespace %s object: %w", prefix, err)
		}
		if delim, ok := token.(json.Delim); !ok || delim != '{' {
			return nil, fmt.Errorf("expected namespace %s object start, got %v", prefix, token)
		}

		for decoder.More() {
			token, err = decoder.Token()
			if err != nil {
				return nil, fmt.Errorf("failed to read key in namespace %s: %w", prefix, err)
			}
			key, ok := token.(string)
			if !ok {
				return nil, fmt.Errorf("expected string key in namespace %s, got %v", prefix, token)
			}

			identity := prefix + "\x00" + key
			if _, exists := seenKeys[identity]; exists {
				duplicates = append(duplicates, DuplicateInfo{
					Key:          key,
					OldPrefix:    prefix,
					NewPrefix:    prefix,
					OldPrefixKey: fmt.Sprintf("%s:%s", prefix, key),
					NewPrefixKey: fmt.Sprintf("%s:%s", prefix, key),
				})
			} else {
				seenKeys[identity] = struct{}{}
			}

			var value interface{}
			if err := decoder.Decode(&value); err != nil {
				return nil, fmt.Errorf("failed to decode %s:%s: %w", prefix, key, err)
			}
		}

		token, err = decoder.Token()
		if err != nil {
			return nil, fmt.Errorf("failed to close namespace %s object: %w", prefix, err)
		}
		if delim, ok := token.(json.Delim); !ok || delim != '}' {
			return nil, fmt.Errorf("expected namespace %s object end, got %v", prefix, token)
		}
	}

	token, err = decoder.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to close top-level object: %w", err)
	}
	if delim, ok := token.(json.Delim); !ok || delim != '}' {
		return nil, fmt.Errorf("expected object end, got %v", token)
	}

	return duplicates, nil
}

func TestFindDuplicateKeysInJSONAllowsSameKeyAcrossNamespaces(t *testing.T) {
	filePath := filepath.Join(t.TempDir(), "cross-namespace.json")
	content := []byte(`{"general":{"Save":"Save"},"user":{"Save":"Save"}}`)
	if err := os.WriteFile(filePath, content, 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	duplicates, err := findDuplicateKeysInJSON(filePath)
	if err != nil {
		t.Fatalf("findDuplicateKeysInJSON() error = %v", err)
	}
	if len(duplicates) != 0 {
		t.Fatalf("duplicates = %#v, want none across namespaces", duplicates)
	}
}

func TestFindDuplicateKeysInJSONReportsDuplicateWithinNamespace(t *testing.T) {
	filePath := filepath.Join(t.TempDir(), "same-namespace.json")
	content := []byte(`{"general":{"Save":"Save","Save":"Save again"}}`)
	if err := os.WriteFile(filePath, content, 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	duplicates, err := findDuplicateKeysInJSON(filePath)
	if err != nil {
		t.Fatalf("findDuplicateKeysInJSON() error = %v", err)
	}
	if len(duplicates) != 1 {
		t.Fatalf("duplicates = %#v, want one same-namespace duplicate", duplicates)
	}
	if duplicates[0].OldPrefixKey != "general:Save" || duplicates[0].NewPrefixKey != "general:Save" {
		t.Fatalf("duplicate = %#v, want complete namespace:key identity", duplicates[0])
	}
}

// TestDeduplicateFrontendI18n 检查前端 en.json 中同 namespace 的重复 i18n key。
func TestDeduplicateFrontendI18n(t *testing.T) {
	filePath := "../../web-admin/src/locales/en/data.json"

	// Find duplicate keys
	duplicates, err := findDuplicateKeysInJSON(filePath)
	if err != nil {
		t.Fatalf("Failed to check for duplicates in frontend i18n file: %v", err)
	}

	// Print all duplicates and fail the test if any are found
	if len(duplicates) > 0 {
		t.Errorf("Found duplicate i18n keys in frontend file (%s):", filePath)
		for _, dup := range duplicates {
			t.Errorf("  i18next.t(\"%s\") duplicates with i18next.t(\"%s\")", dup.NewPrefixKey, dup.OldPrefixKey)
		}
		t.Fail()
	}
}

// TestDeduplicateBackendI18n 检查后端 en.json 中同 namespace 的重复 i18n key。
func TestDeduplicateBackendI18n(t *testing.T) {
	filePath := "../i18n/locales/en/data.json"

	// Find duplicate keys
	duplicates, err := findDuplicateKeysInJSON(filePath)
	if err != nil {
		t.Fatalf("Failed to check for duplicates in backend i18n file: %v", err)
	}

	// Print all duplicates and fail the test if any are found
	if len(duplicates) > 0 {
		t.Errorf("Found duplicate i18n keys in backend file (%s):", filePath)
		for _, dup := range duplicates {
			t.Errorf("  i18n.Translate(\"%s\") duplicates with i18n.Translate(\"%s\")", dup.NewPrefixKey, dup.OldPrefixKey)
		}
		t.Fail()
	}
}
