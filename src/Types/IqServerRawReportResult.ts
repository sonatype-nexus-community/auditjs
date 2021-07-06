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
export interface IqServerRawReportResult {
  components: Component[];
}

export interface Component {
  hash: string;
  componentIdentifier: ComponentIdentifier;
  packageUrl: string;
  proprietary: boolean;
  matchState: string;
  pathnames: string[];
  licenseData: LicenseData;
  securityData: SecurityData;
}

export interface ComponentIdentifier {
  format: string;
  coordinates: Coordinates;
}

export interface Coordinates {
  artifactId: string;
  groupId: string;
  version: string;
  extension: string;
  classifier: string;
}

export interface LicenseData {
  declaredLicenses: License[];
  observedLicenses: License[];
  effectiveLicenses: License[];
  overriddenLicenses: any[];
  status: string;
}

export interface License {
  licenseId: string;
  licenseName: string;
}

export interface SecurityData {
  securityIssues: SecurityIssue[];
}

export interface SecurityIssue {
  source: string;
  reference: string;
  severity: number;
  status: string;
  url: string;
  threatCategory: string;
}
