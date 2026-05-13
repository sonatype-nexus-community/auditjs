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
import { OssIndexServerConfig } from './OssIndexServerConfig';
import mock from 'mock-fs';
import os from 'os';
import { ConfigPersist } from './ConfigPersist';

describe('OssIndexServerConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.restore();
  });

  it('should return true when it is able to save a config file', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/nonsense');
    mock({ '/nonsense': {} });

    const config = new OssIndexServerConfig();
    const configPersist = new ConfigPersist('username', 'password', undefined, '/tmp/value');
    expect(config.saveFile(configPersist)).toEqual(true);

    const conf = config.getConfigFromFile('/nonsense/.ossindex/.oss-index-config');

    expect(conf.getUsername()).toEqual('username');
    expect(conf.getToken()).toEqual('password');
    expect(conf.getCacheLocation()).toEqual('/tmp/value');
  });

  it('should save and retrieve server URL from config file', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/nonsense');
    mock({ '/nonsense': {} });

    const config = new OssIndexServerConfig();
    const configPersist = new ConfigPersist(
      'username',
      'password',
      'https://custom-ossindex.example.com',
      '/tmp/value',
    );
    expect(config.saveFile(configPersist)).toEqual(true);

    const conf = config.getConfigFromFile('/nonsense/.ossindex/.oss-index-config');

    expect(conf.getUsername()).toEqual('username');
    expect(conf.getToken()).toEqual('password');
    expect(conf.getServer()).toEqual('https://custom-ossindex.example.com');
    expect(conf.getCacheLocation()).toEqual('/tmp/value');
  });

  it('should return undefined when property does not exist', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/nonsense');
    mock({ '/nonsense': {} });

    const conf = new OssIndexServerConfig();

    expect(conf.getUsername()).toBeUndefined();
    expect(conf.getToken()).toBeUndefined();
    expect(conf.getCacheLocation()).toBeUndefined();
    expect(conf.getServer()).toBeUndefined();
  });
});
