/*
 * Copyright (c) 2019-present Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ora from 'ora';

export class Spinner {
  private spinner?: ora.Ora;

  constructor(readonly silent: boolean = false) {
    if (!silent) {
      this.spinner = ora("Starting application").start();
      this.spinner.succeed();
    }
  }

  public maybeCreateMessageForSpinner(message: string) {
    if (!this.silent) {
      this.spinner?.start(message);
    }
  }

  public maybeSucceed() {
    if (!this.silent) {
      this.spinner?.succeed();
    }
  }

  public maybeStop() {
    if (!this.silent) {
      this.spinner?.stop();
    }
  }

  public maybeFail() {
    if (!this.silent) {
      this.spinner?.fail();
    }
  }
}
