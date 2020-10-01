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

import { License } from "./License";

export class OssIndexServerResult {
  readonly coordinates: string;
  readonly description?: string;
  readonly reference: string;
  readonly vulnerabilities?: Array<Vulnerability>;
  readonly license: License;

  constructor(result: any, license: any) {
    this.coordinates = result.coordinates;
    this.description = result.description;
    this.reference = result.reference;
    this.vulnerabilities = result.vulnerabilities.map((x: any) => {
      return new Vulnerability(x);
    });
    this.license = license;
  }

  public toAuditLog(): string {
    return `${this.coordinates.replace('%40', '@')} - ${this.vulnerabilityMessage()} ${this.licenseMessage()}`;
  }

  private vulnerabilityMessage(): string {
    if (this.vulnerabilities && this.vulnerabilities?.length > 1) {
      return `${this.vulnerabilities.length} vulnerabilities`;
    } else if (this.vulnerabilities && this.vulnerabilities?.length === 1) {
      return `${this.vulnerabilities.length} vulnerability`;
    } else {
      return `No vulnerabilities`;
    }
  }

  private licenseMessage(): string {
    if (this.license && this.license?.banned) {
      return `and a license issue found!`;
    } else {
      return `and no license issues found!`;
    }
  }
}

export class Vulnerability {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly cvssScore: string;
  readonly cvssVector: string;
  readonly cve: string;
  readonly reference: string;
  constructor(vulnerability: any) {
    this.id = vulnerability.id;
    this.title = vulnerability.title;
    this.description = vulnerability.description;
    this.cvssScore = vulnerability.cvssScore;
    this.cvssVector = vulnerability.cvssVector;
    this.cve = vulnerability.cve;
    this.reference = vulnerability.reference;
  }
}
