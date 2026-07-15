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
	"os"
	"path/filepath"
	"testing"
)

func TestGenerateRsaKeys(t *testing.T) {
	certificate, privateKey, err := generateRsaKeys(4096, 512, 20, "Casdoor Cert", "Casdoor Organization")
	if err != nil {
		t.Fatalf("generateRsaKeys() error = %v", err)
	}
	assertGeneratedKeyPairFiles(t, certificate, privateKey)
}

func TestGenerateEsKeys(t *testing.T) {
	certificate, privateKey, err := generateEsKeys(256, 20, "Casdoor Cert", "Casdoor Organization")
	if err != nil {
		t.Fatalf("generateEsKeys() error = %v", err)
	}
	assertGeneratedKeyPairFiles(t, certificate, privateKey)
}

func TestGenerateRsaPssKeys(t *testing.T) {
	certificate, privateKey, err := generateRsaPssKeys(4096, 256, 20, "Casdoor Cert", "Casdoor Organization")
	if err != nil {
		t.Fatalf("generateRsaPssKeys() error = %v", err)
	}
	assertGeneratedKeyPairFiles(t, certificate, privateKey)
}

func assertGeneratedKeyPairFiles(t *testing.T, certificate string, privateKey string) {
	t.Helper()
	tempDir := t.TempDir()
	files := map[string]string{
		filepath.Join(tempDir, "certificate.pem"): certificate,
		filepath.Join(tempDir, "private.key"):     privateKey,
	}
	for path, content := range files {
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatalf("write generated key material: %v", err)
		}
		got, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read generated key material: %v", err)
		}
		if string(got) != content {
			t.Fatalf("generated key material changed after temporary file round trip")
		}
	}
}
