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

export class AuditIQServer {
  public auditThirdPartyResults(results: ReportStatus): boolean {
    if (results.isError) {
      visuallySeperateText(true, [results.errorMessage]);
      return true;
    }
    if (results.policyAction === 'Failure') {
      visuallySeperateText(true, [
        `Sonabot here, you have some build-breaking policy violations to clean up!`,
        chalk.keyword('orange').bold(`Report URL: ${results.reportHtmlUrl}`),
      ]);
      return true;
    }
    visuallySeperateText(false, [
      `Wonderbar! No build-breaking violations for this stage. You may still have non-breaking policy violations in the report.`,
      chalk.keyword('green').bold(`Report URL: ${results.reportHtmlUrl}`),
    ]);
    return false;
  }
}
