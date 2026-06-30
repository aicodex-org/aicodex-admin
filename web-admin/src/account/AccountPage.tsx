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

import React from "react";
import UserEditPage from "../UserEditPage";
import type {AdminAccount, LegacyAny} from "../types/legacyPage";

type AccountPageProps = {
  account: AdminAccount;
  location?: LegacyAny;
  onUpdateAccount?: (...args: LegacyAny[]) => void;
};

class AccountPage extends React.Component<AccountPageProps> {
  render() {
    return (
      <UserEditPage
        organizationName={this.props.account.owner}
        userName={this.props.account.name}
        account={this.props.account as LegacyAny}
        location={this.props.location}
        onUpdateAccount={this.props.onUpdateAccount}
      />
    );
  }
}

export default AccountPage;
