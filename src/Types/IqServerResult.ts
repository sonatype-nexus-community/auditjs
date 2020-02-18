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
export class IqServerResult {
  readonly component: Component;
  readonly matchState: string;
  readonly catalogDate: string;
  readonly licenseData: LicenseData;
  readonly securityData: SecurityData;
  readonly policyData: PolicyData;

  constructor(result: any) {
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
  readonly componentIdentifier: {};
  readonly proprietary: boolean;

  constructor(component: any) {
    this.packageUrl = component.packageUrl;
    this.hash = component.hash;
    this.componentIdentifier = new ComponentIdentifier(component.componentIdentifier);
    this.proprietary = component.proprietary;
  }
}

class ComponentIdentifier {
  readonly format: string;
  readonly coordinates: Record<string, any>;

  constructor(componentIdentifier: any) {
    this.format = componentIdentifier.format;
    this.coordinates = componentIdentifier.coordinates;
  }
}

class LicenseData {
  readonly declaredLicenses: {};
  readonly observedLicenses: {};
  readonly overriddenLicenses: {};
  readonly status: string;

  constructor(licenseData: any) {
    this.declaredLicenses = licenseData.declaredLicenses;
    this.observedLicenses = licenseData.observedLicenses;
    this.overriddenLicenses = licenseData.overriddenLicenses;
    this.status = licenseData.status;
  }
}

class SecurityData {
  constructor(readonly securityData: any) {}
}

class PolicyData {
  constructor(readonly policyData: any) {}
}
