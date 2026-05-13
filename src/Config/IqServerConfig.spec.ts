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
import mock from 'mock-fs';
import os from 'os';
import { ConfigPersist } from './ConfigPersist';

describe('IqServerConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.restore();
  });

  it('should return true when it is able to save a config file', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/nonsense');
    mock({ '/nonsense': {} });

    const config = new IqServerConfig();
    const configPersist = new ConfigPersist('username', 'password', 'http://localhost:8070');
    expect(config.saveFile(configPersist)).toEqual(true);

    const conf = config.getConfigFromFile('/nonsense/.iqserver/.iq-server-config');

    expect(conf.getUsername()).toEqual('username');
    expect(conf.getToken()).toEqual('password');
    expect(conf.getHost()).toEqual('http://localhost:8070');
  });
});
