/*
 * Copyright 2019-Present Sonatype Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class Coordinates {
  constructor(readonly name: string, readonly version: string, readonly group?: string) {}

  public toPurl(ecosystem = 'npm'): string {
    if (this.group) {
      // TODO: IQ does not need the @ sign replaced with %40, probably want to figure out someway to handle this correctly
      return `pkg:${ecosystem}/${this.group.replace('@', '%40')}/${this.name}@${this.version}`;
    }
    return `pkg:${ecosystem}/${this.name}@${this.version}`;
  }
}
