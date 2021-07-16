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

import { Formatter } from './Formatter';
import { ComponentDetails, ComponentContainer, SecurityIssue, SecurityData } from '@sonatype/js-sona-types';
import chalk = require('chalk');
import { AuditGraph } from '../AuditGraph';

export class TextFormatter implements Formatter {
  constructor(readonly quiet: boolean = false, private graph?: AuditGraph) {}

  public printAuditResults(components: ComponentDetails) {
    const total = components.componentDetails.length;
    components.componentDetails = components.componentDetails.sort((a, b) => {
      return a.component.packageUrl < b.component.packageUrl ? -1 : 1;
    });

    console.log();
    console.group();
    this.printLine('Sonabot here, beep boop beep boop, here are your Sonatype OSS Index results:');
    this.suggestIncludeDevDeps(total);
    console.groupEnd();
    console.log();

    this.printLine('-'.repeat(process.stdout.columns));

    components.componentDetails.forEach((x: ComponentContainer, i: number) => {
      if (x.securityData && x.securityData.securityIssues.length > 0) {
        this.printVulnerability(i, total, x);
        if (this.graph) {
          console.group();
          console.log("Inverse dependency graph:");
          this.graph?.printGraph(x.component.packageUrl);
          console.groupEnd();
          console.log();
        }
      } else {
        this.printLine(chalk.keyword('green')(`[${i + 1}/${total}] - ${this.toAuditLog(x.component.packageUrl, x.securityData)}`));
      }
    });

    this.printLine('-'.repeat(process.stdout.columns));
  }

  private toAuditLog(coordinates: string, vulns: SecurityData | null | undefined): string {
    return `${coordinates.replace('%40', '@')} - ${this.vulnerabilityMessage(vulns)}`;
  }

  private vulnerabilityMessage(vulns: SecurityData | null | undefined): string {
    if (vulns && vulns.securityIssues && vulns.securityIssues.length > 1) {
      return `${vulns.securityIssues.length} vulnerabilities found!`;
    } else if (vulns && vulns.securityIssues && vulns.securityIssues.length === 1) {
      return `${vulns.securityIssues.length} vulnerability found!`;
    } else {
      return `No vulnerabilities found!`;
    }
  }

  private getColorFromMaxScore(maxScore: number, defaultColor = 'chartreuse'): string {
    if (maxScore > 8) {
      defaultColor = 'red';
    } else if (maxScore > 6) {
      defaultColor = 'orange';
    } else if (maxScore > 4) {
      defaultColor = 'yellow';
    }
    return defaultColor;
  }

  private printVulnerability(i: number, total: number, component: ComponentContainer): void {
    if (!component.securityData || !component.securityData.securityIssues || component.securityData.securityIssues.length == 0) {
      return;
    }
    const maxScore: number = Math.max(
      ...component.securityData.securityIssues.map((x: SecurityIssue) => {
        return +x.severity;
      }),
    );
    const printVuln = (x: SecurityIssue[]): void => {
      x.forEach((y: SecurityIssue) => {
        const color: string = this.getColorFromMaxScore(+y.severity);
        console.group();
        this.printVulnField(color, `Vulnerability Title: `, y.reference);
        this.printVulnField(color, `ID: `, y.id);
        this.printVulnField(color, `Description: `, y.description);
        this.printVulnField(color, `CVSS Score: `, y.severity.toString());
        this.printVulnField(color, `CVSS Vector: `, y.vector);
        this.printVulnField(color, `CVE: `, y.source);
        this.printVulnField(color, `Reference: `, y.url);
        console.log();
        console.groupEnd();
      });
    };

    console.log(
      chalk.keyword(this.getColorFromMaxScore(maxScore)).bold(`[${i + 1}/${total}] - ${this.toAuditLog(component.component.packageUrl, component.securityData)}`),
    );
    console.log();
    component.securityData && component.securityData.securityIssues && component.securityData.securityIssues.length > 0
      printVuln(
        component.securityData.securityIssues.sort((x, y) => {
          return +y.severity - +x.severity;
        }),
      );
  }

  private printLine(line: any): void {
    if (!this.quiet) {
      console.log(line);
    }
  }

  private printVulnField(color: string, title: string, field: string | null | undefined) {
    if (field) {
      console.log(chalk.keyword(color)(title), field);
    }
  }

  private suggestIncludeDevDeps(total: number) {
    this.printLine(`Total dependencies audited: ${total}`);
    if (total == 0) {
      this.printLine(
        `We noticed you had 0 dependencies, we exclude devDependencies by default, try running with --dev if you want to include those as well`,
      );
    }
  }
}
