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

interface PolicyDataJSON {
  [key: string]: unknown;
}
interface SecurityDataJSON {
  [key: string]: unknown;
}
interface LicenseDataJSON {
  declaredLicenses: unknown;
  observedLicenses: unknown;
  overriddenLicenses: unknown;
  status: string;
}
interface ComponentIdentifierJSON {
  format: string;
  coordinates: Record<string, unknown>;
}
interface ComponentJSON {
  packageUrl: string;
  hash: string;
  componentIdentifier: ComponentIdentifierJSON;
  proprietary: boolean;
}
interface IqServerResultJSON {
  component: ComponentJSON;
  matchState: string;
  catalogDate: string;
  licenseData: LicenseDataJSON;
  securityData: SecurityDataJSON;
  policyData: PolicyDataJSON;
}

export class IqServerResult {
  readonly component: Component;
  readonly matchState: string;
  readonly catalogDate: string;
  readonly licenseData: LicenseData;
  readonly securityData: SecurityData;
  readonly policyData: PolicyData;

  constructor(result: IqServerResultJSON) {
    this.component = new Component(result.component);
    this.matchState = result.matchState;
    this.catalogDate = result.catalogDate;
    this.licenseData = new LicenseData(result.licenseData);
    this.securityData = new SecurityData(result.securityData);
    this.policyData = new PolicyData(result.policyData);
  }

  public toAuditLog(): string {
    return `${this.component.packageUrl} - ${this.component.hash}`;
  }
}

class Component {
  readonly packageUrl: string;
  readonly hash: string;
  readonly componentIdentifier: ComponentIdentifier;
  readonly proprietary: boolean;

  constructor(component: ComponentJSON) {
    this.packageUrl = component.packageUrl;
    this.hash = component.hash;
    this.componentIdentifier = new ComponentIdentifier(component.componentIdentifier);
    this.proprietary = component.proprietary;
  }
}

class ComponentIdentifier {
  readonly format: string;
  readonly coordinates: Record<string, unknown>;

  constructor(componentIdentifier: ComponentIdentifierJSON) {
    this.format = componentIdentifier.format;
    this.coordinates = componentIdentifier.coordinates;
  }
}

class LicenseData {
  readonly declaredLicenses: unknown;
  readonly observedLicenses: unknown;
  readonly overriddenLicenses: unknown;
  readonly status: string;

  constructor(licenseData: LicenseDataJSON) {
    this.declaredLicenses = licenseData.declaredLicenses;
    this.observedLicenses = licenseData.observedLicenses;
    this.overriddenLicenses = licenseData.overriddenLicenses;
    this.status = licenseData.status;
  }
}

class SecurityData {
  constructor(readonly securityData: SecurityDataJSON) {}
}

class PolicyData {
  constructor(readonly policyData: PolicyDataJSON) {}
}
