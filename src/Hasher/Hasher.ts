/*
 * Copyright (c) 2020-present Sonatype, Inc.
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

import fs from 'fs';
import crypto from 'crypto';

export class Hasher {
  constructor(readonly algorithm: string = 'sha1') {}

  public getHashFromPath(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let fd = fs.createReadStream(path);
      let hash = crypto.createHash(this.algorithm);
      hash.setEncoding('hex');

      fd.on('end', () => {
        hash.end();
        resolve(hash.read());
      });

      fd.on('error', (err) => {
        reject(err);
      });

      fd.pipe(hash);
    });
  }
}