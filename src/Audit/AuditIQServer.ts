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

import { ReportStatus } from '../Types/ReportStatus';
import chalk = require('chalk');
import { visuallySeperateText } from '../Visual/VisualHelper';
import { Component, IqServerPolicyReportResult } from '../Types/IqServerPolicyReportResult';
import { AuditGraph } from './AuditGraph';

export class AuditIQServer {
  constructor(private graph?: AuditGraph) {}

  public auditThirdPartyResults(results: ReportStatus, policyReport?: IqServerPolicyReportResult): boolean {
    if (results.isError) {
      visuallySeperateText(true, [results.errorMessage]);
      return true;
    }
    if (results.policyAction === 'Failure') {
      this.handleFailure(results.reportHtmlUrl!, policyReport);
      return true;
    }
    visuallySeperateText(false, [
      `Wonderbar! No build-breaking violations for this stage. You may still have non-breaking policy violations in the report.`,
      chalk.keyword('green').bold(`Report URL: ${results.reportHtmlUrl}`),
    ]);
    return false;
  }

  private handleFailure(reportURL: string, policyReport?: IqServerPolicyReportResult) {
    visuallySeperateText(true, [
      `Sonabot here, you have some build-breaking policy violations to clean up!`,
      chalk.keyword('orange').bold(`Report URL: ${reportURL}`),
    ]);

    if (policyReport) {
      this.printPolicyViolations(policyReport);
    }
  }

  private printPolicyViolations(policyReport: IqServerPolicyReportResult) {
    const violators = policyReport.components.filter((comp) => {
      return comp.violations && comp.violations.length > 0;
    });

    if (violators.length > 0) {
      console.log('Components with policy violations found');

      violators.map((comp) => {
        this.doPrintPolicyViolation(comp);
      });
    }
  }

  private doPrintPolicyViolation(component: Component) {
    console.group(`Package URL: ${chalk.bgBlack(chalk.cyan(component.packageUrl))}`);
    console.log(
      `Known violations: ${component.violations
        .map((violation) => {
          return violation.policyName;
        })
        .join(', ')}`,
    );
    if (this.graph) {
      console.log(`Inverse dependency tree: `);

      this.graph.printGraph(component.packageUrl);
    }
    console.groupEnd();
    console.log();
  }
}
