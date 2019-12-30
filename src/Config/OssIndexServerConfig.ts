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
import { Config } from "../Types/Config";

export class OssIndexServerConfig extends Config {

  constructor(
    readonly username: string, 
    readonly token: string) 
  {
    super(username, token);
  }

  saveConfigToFile(saveLocation: string = this.getSaveLocation()): boolean {
    throw new Error("Method not implemented.");
  }
    
  getConfigFromFile(saveLocation: string = this.getSaveLocation()): Config {
    return new OssIndexServerConfig("test", "password");
  }
}
