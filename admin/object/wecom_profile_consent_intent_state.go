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
	"fmt"
	"strings"
	"time"

	"github.com/xorm-io/core"
)

type WecomProfileConsentIntentMutator func(intent *WecomProfileConsentIntent) (bool, error)

func GetWecomProfileConsentIntentByName(name string) (*WecomProfileConsentIntent, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, nil
	}

	intent := &WecomProfileConsentIntent{}
	existed, err := ormer.Engine.Where("name = ?", name).Get(intent)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return intent, nil
}

// TransitionWecomProfileConsentIntent 使用行级锁按状态原子推进意图，避免重复消费建立会话。
func TransitionWecomProfileConsentIntent(name string, allowedStatuses []WecomProfileConsentIntentStatus, mutate WecomProfileConsentIntentMutator) (*WecomProfileConsentIntent, bool, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, false, fmt.Errorf("wecom profile consent intent name is required")
	}
	if mutate == nil {
		return nil, false, fmt.Errorf("wecom profile consent intent mutator is required")
	}

	session := ormer.Engine.NewSession()
	defer session.Close()
	if err := session.Begin(); err != nil {
		return nil, false, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = session.Rollback()
		}
	}()

	intent := &WecomProfileConsentIntent{}
	existed, err := session.Where("name = ?", name).ForUpdate().Get(intent)
	if err != nil {
		return nil, false, err
	}
	if !existed {
		if err := session.Commit(); err != nil {
			return nil, false, err
		}
		committed = true
		return nil, false, nil
	}

	if len(allowedStatuses) > 0 && !containsWecomProfileConsentStatus(allowedStatuses, intent.Status) {
		if err := session.Commit(); err != nil {
			return nil, false, err
		}
		committed = true
		return intent, false, nil
	}

	changed, err := mutate(intent)
	if err != nil {
		return nil, false, err
	}
	if !changed {
		if err := session.Commit(); err != nil {
			return nil, false, err
		}
		committed = true
		return intent, false, nil
	}

	if _, err := session.ID(core.PK{intent.Owner, intent.Name}).AllCols().Update(intent); err != nil {
		return nil, false, err
	}
	if err := session.Commit(); err != nil {
		return nil, false, err
	}
	committed = true
	return intent, true, nil
}

func ExpireWecomProfileConsentIntentIfNeeded(name string, now time.Time) (*WecomProfileConsentIntent, bool, error) {
	now = now.UTC()
	return TransitionWecomProfileConsentIntent(name,
		[]WecomProfileConsentIntentStatus{
			WecomProfileConsentIntentStatusPending,
			WecomProfileConsentIntentStatusAuthorized,
			WecomProfileConsentIntentStatusMfaPending,
		},
		func(intent *WecomProfileConsentIntent) (bool, error) {
			if intent == nil || !intent.IsExpired(now) {
				return false, nil
			}
			intent.Status = WecomProfileConsentIntentStatusExpired
			intent.ErrorCode = "intent_expired"
			intent.ErrorText = "wecom profile consent intent expired"
			return true, nil
		},
	)
}

func containsWecomProfileConsentStatus(values []WecomProfileConsentIntentStatus, current WecomProfileConsentIntentStatus) bool {
	for _, value := range values {
		if value == current {
			return true
		}
	}
	return false
}
