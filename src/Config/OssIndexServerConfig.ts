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
import { writeFileSync, readFileSync } from "fs";
import { logMessage, ERROR } from "../Application/Logger/Logger";

export class OssIndexServerConfig extends Config {
  private username: string;
  private token: string;

  constructor() {
    super();
    this.username = '';
    this.token = '';
  }

  public saveConfigToFile(
    saveLocation: string = this.getSaveLocation()
  ): boolean {
    let ableToWrite = false;

    try {
      writeFileSync(saveLocation, this.getStringToSave, { flag: "wx" });
      ableToWrite = true;
    } catch (e) {
      logMessage(e, ERROR);
    }

    return ableToWrite;
  }

  public getConfigFromFile(
    saveLocation: string = this.getSaveLocation()
  ): Config {
    let fileString = readFileSync(saveLocation, 'utf8');
    let splitString = fileString.split('\n');
    this.username = splitString[0].split(':')[1].trim();
    this.token = splitString[1].split(':')[1].trim();

    return this;
  }

  public getStringToSave(): string {
    return `Username: ${this.username}\nPassword: ${this.token}`;
  }

  public getUsername(): string {
    return this.username;
  }

  public getToken(): string {
    return this.token;
  }

  public getBasicAuth(): string[] {
    return ['Authorization', `Basic ${this.username}:${this.token}`];
  }
}
