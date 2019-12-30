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
import { Config } from "../Types/Config";
import path from 'path';
import { unlinkSync } from 'fs';

const TEST_FILE = path.join(__dirname, "test.txt");

describe("OssIndexServerConfig", () => {
  after(() => {
    try {
      unlinkSync(TEST_FILE);
      console.log("Test config file deleted")
    } catch {
      console.log("There was no test config file to delete")
    }
  })

  it("should return true when it is able to save a config file", () => {
    expect(OssIndexServerConfig.saveConfigToFile(TEST_FILE)).to.equal(true);
  })

  it("should get credentials from a config file", () => {
    let {username, token} = OssIndexServerConfig.getConfigFromFile(TEST_FILE)
    expect(username).to.equal("testing");
    expect(token).to.equal("password");
  })
});
