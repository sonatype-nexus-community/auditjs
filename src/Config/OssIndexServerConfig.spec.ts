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
import { readFileSync } from 'fs';
import sinon from 'sinon';
import os from 'os';

describe("OssIndexServerConfig", async () => {
  it("should return true when it is able to save a config file", async () => {
    sinon.stub(os, 'homedir').returns('/nonsense');
    mock({ '/nonsense': {}});

    let config = new OssIndexServerConfig("username", "password");
    expect(config.saveFile()).to.equal(true);

    let file = readFileSync('/nonsense/.ossindex/.oss-index-config');

    expect(file.toString()).to.equal('Username: username\nPassword: password\n');
    mock.restore();
    sinon.restore();
  });
});
