// Copyright 2021 The casbin Authors. All Rights Reserved.
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

package certificate

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerateEccKey(t *testing.T) {
	eccKey, err := generateEccKey()
	assert.Nil(t, err)
	eccKeyStr, err := encodeEccKey(eccKey)
	assert.Nil(t, err)
	keyPath := filepath.Join(t.TempDir(), "acme_account.key")
	assert.NoError(t, os.WriteFile(keyPath, []byte(eccKeyStr), 0o600))
	stored, err := os.ReadFile(keyPath)
	assert.NoError(t, err)
	assert.Equal(t, eccKeyStr, string(stored))
}
