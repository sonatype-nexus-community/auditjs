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
import { IqServerConfig } from './IqServerConfig';
import mock from 'mock-fs';
import { readFileSync } from 'fs';
import sinon from 'sinon';
import os from 'os';

let osmock = sinon.mock(os);

describe("IqServerConfig", async () => {
  beforeEach( async () => {
    osmock.expects('homedir').returns('/nonsense');
  });

  after(async () => {
    osmock.restore();
  })

  it("should return true when it is able to save a config file", async () => {
    mock({ '/nonsense': {}});

    let config = new IqServerConfig("username", "password", "http://localhost:8070");
    expect(config.saveFile()).to.equal(true);

    let file = readFileSync('/nonsense/.iq-server-config');

    expect(file.toString()).to.equal('Username: username\nPassword: password\nHost: http://localhost:8070');
    mock.restore();
  });

  it("should get valid basic auth credentials from a config file", async () => {
    mock({ '/nonsense': {
      '.iq-server-config': 'Username: username\nPassword: password\nHost: http://localhost:8070'
    }});

    let config = new IqServerConfig().getConfigFromFile();
    
    expect(config.getBasicAuth()[0]).to.equal("Authorization");
    expect(config.getBasicAuth()[1]).to.equal("Basic dXNlcm5hbWU6cGFzc3dvcmQ=");

    mock.restore();
  });
});
