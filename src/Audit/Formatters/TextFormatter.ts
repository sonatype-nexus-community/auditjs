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
import { OssIndexServerResult, Vulnerability } from '../../Types/OssIndexServerResult';
import chalk = require('chalk');

export class TextFormatter implements Formatter {
  constructor(readonly quiet: boolean = false) {}

  public printAuditResults(list: Array<OssIndexServerResult>) {
    const total = list.length;
    list = list.sort((a, b) => {
      return a.coordinates < b.coordinates ? -1 : 1;
    });

    console.log();
    console.group();
    this.printLine('Sonabot here, beep boop beep boop, here are your Sonatype OSS Index results:');
    this.suggestIncludeDevDeps(total);
    console.groupEnd();
    console.log();

    this.printLine('-'.repeat(process.stdout.columns));

    list.forEach((x: OssIndexServerResult, i: number) => {
      if (x.vulnerabilities && x.vulnerabilities.length > 0) {
        this.printVulnerability(i, total, x);
      } else {
        this.printLine(chalk.keyword('green')(`[${i + 1}/${total}] - ${x.toAuditLog()}`));
        console.group();
        this.printLine(chalk.keyword('green')(`Path: ${x.realPath}`));
        this.printLine(chalk.keyword('green')(`Required By: ${x.requiredBy}`));
        console.groupEnd();
      }
    });

    this.printLine('-'.repeat(process.stdout.columns));
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

  private printVulnerability(i: number, total: number, result: OssIndexServerResult): void {
    if (!result.vulnerabilities) {
      return;
    }
    const maxScore: number = Math.max(
      ...result.vulnerabilities.map((x: Vulnerability) => {
        return +x.cvssScore;
      }),
    );
    const printVuln = (x: Array<Vulnerability>): void => {
      x.forEach((y: Vulnerability) => {
        const color: string = this.getColorFromMaxScore(+y.cvssScore);
        console.group();
        this.printVulnField(color, `Vulnerability Title: `, y.title);
        this.printVulnField(color, `ID: `, y.id);
        this.printVulnField(color, `Description: `, y.description);
        this.printVulnField(color, `CVSS Score: `, y.cvssScore);
        this.printVulnField(color, `CVSS Vector: `, y.cvssVector);
        this.printVulnField(color, `CVE: `, y.cve);
        this.printVulnField(color, `Reference: `, y.reference);
        console.log();
        console.groupEnd();
      });
    };

    console.log(
      chalk.keyword(this.getColorFromMaxScore(maxScore)).bold(`[${i + 1}/${total}] - ${result.toAuditLog()}`),
    );
    console.log(chalk.keyword(this.getColorFromMaxScore(maxScore)).bold(`Path: ${result.realPath}`));
    console.log(chalk.keyword(this.getColorFromMaxScore(maxScore)).bold(`Required By: ${result.requiredBy}`));
    console.log();
    result.vulnerabilities &&
      printVuln(
        result.vulnerabilities.sort((x, y) => {
          return +y.cvssScore - +x.cvssScore;
        }),
      );
  }

  private printLine(line: any): void {
    if (!this.quiet) {
      console.log(line);
    }
  }

  private printVulnField(color: string, title: string, field: string) {
    if (typeof field !== 'undefined') {
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
