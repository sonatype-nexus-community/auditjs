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
import expect from '../Tests/TestHelper';
import { OssIndexServerConfig } from './OssIndexServerConfig';
import mock from 'mock-fs';
import sinon from 'sinon';
import os from 'os';
import { ConfigPersist } from './ConfigPersist';

describe("OssIndexServerConfig", async () => {
  it("should return true when it is able to save a config file", async () => {
    sinon.stub(os, 'homedir').returns('/nonsense');
    mock({ '/nonsense': {}});

    let config = new OssIndexServerConfig();
    let configPersist = new ConfigPersist("username", "password", undefined, "/tmp/value");
    expect(config.saveFile(configPersist)).to.equal(true);

    let conf = config.getConfigFromFile('/nonsense/.ossindex/.oss-index-config');

    expect(conf.getUsername()).to.equal('username');
    expect(conf.getToken()).to.equal('password');
    expect(conf.getCacheLocation()).to.equal('/tmp/value');
    mock.restore();
    sinon.restore();
  });
});
