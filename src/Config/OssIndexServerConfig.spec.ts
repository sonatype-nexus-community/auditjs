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
import path from 'path';
import mock from 'mock-fs';
import sinon from 'sinon';
import os from 'os';

describe("OssIndexServerConfig", () => {

  // it("should return true when it is able to save a config file", () => {
  //   expect(new OssIndexServerConfig().saveConfigToFile(TEST_FILE)).to.equal(true);
  // })

  it("should get credentials from a config file", () => {
    mock({
      '/nonsense': {
        '.oss-index-config': 'Username: testing\nPassword: password'
      }
    })

    let osmock = sinon.mock(os);
    osmock.expects('homedir').returns('/nonsense');

    let config = new OssIndexServerConfig().getConfigFromFile('/nonsense/.oss-index-config');
    
    expect(config.getUsername()).to.equal("testing");
    expect(config.getToken()).to.equal("password");
    mock.restore();
    osmock.restore();
  })
});
