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

import { expect, describe, it, afterEach } from 'vitest';
import { Agent as UndiciAgent, ProxyAgent } from 'undici';
import { RequestHelpers } from './RequestHelpers';
import os from 'os';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pack = require('../../package.json');

describe('RequestHelpers', () => {
  afterEach(() => {
    delete process.env.http_proxy;
    delete process.env.https_proxy;
  });

  it('should return a valid user agent from getUserAgent', () => {
    const nodeVersion = process.versions;
    const environment = 'NodeJS';
    const environmentVersion = nodeVersion.node;
    const system = `${os.type()} ${os.release()}`;
    const res = RequestHelpers.getUserAgent();
    const expected = ['User-Agent', `AuditJS/${pack.version} (${environment} ${environmentVersion}; ${system})`];

    expect(res).toEqual(expected);
  });

  it('getAgent() should return undefined when no env variable is set', () => {
    process.env.http_proxy = 'no-proxy';

    const res = RequestHelpers.getAgent();
    expect(res).toBeUndefined();
  });

  it('getAgent() should return a ProxyAgent when env variable is set', () => {
    process.env.http_proxy = 'http://test.local:8080';
    const res = RequestHelpers.getAgent();
    expect(res).not.toBeUndefined();
    expect(res).toBeInstanceOf(ProxyAgent);
  });

  it('getAgent() should return an insecure UndiciAgent', () => {
    const res = RequestHelpers.getAgent(true);
    expect(res).not.toBeUndefined();
    expect(res).toBeInstanceOf(UndiciAgent);
  });

  it('should return a ProxyAgent when env variable is set', () => {
    process.env.http_proxy = 'http://test.local:8080';
    const res = RequestHelpers.getHttpAgent();
    expect(res).not.toBeUndefined();
    expect(res).toBeInstanceOf(ProxyAgent);
  });

  it('should return undefined when no env variable is set', () => {
    process.env.http_proxy = 'no-proxy';

    const res = RequestHelpers.getHttpAgent();
    expect(res).toBeUndefined();
  });
});
