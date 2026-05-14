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

import { expect, vi, describe, it, afterEach } from 'vitest';
import { IqServerConfig } from './IqServerConfig';
import { mkdtempSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigPersist } from './ConfigPersist';

describe('IqServerConfig', () => {
  let tmpDir: string;

  afterEach(() => {
    vi.restoreAllMocks();
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return true when it is able to save a config file', () => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'auditjs-test-iq-'));
    vi.spyOn(os, 'homedir').mockReturnValue(tmpDir);

    const config = new IqServerConfig();
    const configPersist = new ConfigPersist('username', 'password', 'http://localhost:8070');
    expect(config.saveFile(configPersist)).toEqual(true);

    const conf = config.getConfigFromFile(path.join(tmpDir, '.iqserver', '.iq-server-config'));

    expect(conf.getUsername()).toEqual('username');
    expect(conf.getToken()).toEqual('password');
    expect(conf.getHost()).toEqual('http://localhost:8070');
  });
});
