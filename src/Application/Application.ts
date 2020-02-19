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
import { textSync } from 'figlet';

import { IqRequestService } from '../Services/IqRequestService';
import { NpmList } from '../Munchers/NpmList';
import { Coordinates } from '../Types/Coordinates';
import { Muncher } from '../Munchers/Muncher';
import { OssIndexRequestService } from '../Services/OssIndexRequestService';
import { AuditIQServer } from '../Audit/AuditIQServer';
import { AuditOSSIndex } from '../Audit/AuditOSSIndex';
import { OssIndexServerResult } from '../Types/OssIndexServerResult';
import { ReportStatus } from '../Types/ReportStatus';
import { Bower } from '../Munchers/Bower';
import { DEBUG, ERROR, logger, logMessage } from './Logger/Logger';
import { Spinner } from './Spinner/Spinner';
import { filterVulnerabilities } from '../Whitelist/VulnerabilityExcluder';
import { IqServerConfig } from '../Config/IqServerConfig';
import { OssIndexServerConfig } from '../Config/OssIndexServerConfig';
import { visuallySeperateText } from '../Visual/VisualHelper';
import { Logger } from 'pino';
const pj = require('../../package.json');

export class Application {
  private results: Array<Coordinates> = [];
  private sbom = '';
  private muncher: Muncher;
  private spinner: Spinner;

  constructor(
    readonly devDependency: boolean = false,
    readonly silent: boolean = false,
    readonly artie: boolean = false,
  ) {
    const npmList = new NpmList(devDependency);
    const bower = new Bower(devDependency);

    this.printHeader();
    this.spinner = new Spinner(silent);

    if (npmList.isValid()) {
      logMessage('Setting Muncher to npm list', DEBUG);
      this.muncher = npmList;
    } else if (bower.isValid()) {
      logMessage('Setting Muncher to bower', DEBUG);
      this.muncher = bower;
    } else {
      logMessage(
        'Failed project directory validation.  Are you in a (built) node, yarn, or bower project directory?',
        'error',
      );
      throw new Error('Could not instantiate muncher');
    }
  }

  public async startApplication(args: any): Promise<void> {
    if (args.verbose) {
      // setConsoleTransportLevel(DEBUG);
    }
    // args has sensitive info in it, such as username/password, etc... do not log them in total
    if (args._[0] == 'iq') {
      logMessage('Attempting to start application', DEBUG);
      logMessage('Getting coordinates for Sonatype IQ', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Sonatype IQ');
      await this.populateCoordinatesForIQ();
      logMessage(`Coordinates obtained`, DEBUG, this.sbom);

      this.spinner.maybeSucceed();
      logMessage(`Auditing application`, DEBUG, args.application);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Sonatype IQ');
      await this.auditWithIQ(args);
    } else if (args._[0] == 'ossi') {
      logMessage('Attempting to start application', DEBUG);

      logMessage('Getting coordinates for Sonatype OSS Index', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Sonatype OSS Index');
      await this.populateCoordinates();
      logMessage(`Coordinates obtained`, DEBUG, this.results);

      this.spinner.maybeSucceed();
      logMessage('Auditing your application with Sonatype OSS Index', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Sonatype OSS Index');
      await this.auditWithOSSIndex(args);
    } else {
      process.exit(0);
    }
  }

  private printHeader(): void {
    if (this.silent) {
      return;
    } else if (this.artie) {
      this.doPrintHeader('ArtieJS', 'Ghost');
    } else {
      this.doPrintHeader();
    }
  }

  private doPrintHeader(title = 'AuditJS', font: figlet.Fonts = '3D-ASCII'): void {
    console.log(textSync(title, { font: font, horizontalLayout: 'fitted' }));
    console.log(textSync('By Sonatype & Friends', { font: 'Pepper' }));
    visuallySeperateText(false, [`${title} version: ${pj.version}`]);
  }

  private async populateCoordinates(): Promise<void> {
    try {
      logMessage('Trying to get dependencies from Muncher', DEBUG);
      this.results = await this.muncher.getDepList();
      logMessage('Successfully got dependencies from Muncher', DEBUG);
    } catch (e) {
      logMessage(`An error was encountered while gathering your dependencies.`, ERROR, {
        title: e.message,
        stack: e.stack,
      });
      process.exit(1);
    }
  }

  private async populateCoordinatesForIQ(): Promise<void> {
    try {
      logMessage('Trying to get sbom from cyclonedx/bom', DEBUG);
      this.sbom = await this.muncher.getSbomFromCommand();
      logMessage('Successfully got sbom from cyclonedx/bom', DEBUG);
    } catch (e) {
      logMessage(`An error was encountered while gathering your dependencies into an SBOM`, ERROR, {
        title: e.message,
        stack: e.stack,
      });
      process.exit(1);
    }
  }

  private async auditWithOSSIndex(args: any): Promise<void> {
    logMessage('Instantiating OSS Index Request Service', DEBUG);
    const requestService = this.getOssIndexRequestService(args);
    this.spinner.maybeSucceed();

    logMessage('Submitting coordinates to Sonatype OSS Index', DEBUG);
    this.spinner.maybeCreateMessageForSpinner('Submitting coordinates to Sonatype OSS Index');

    const format = this.muncher instanceof Bower ? 'bower' : 'npm';
    logMessage('Format to query OSS Index picked', DEBUG, { format: format });
    try {
      logMessage('Attempting to query OSS Index or use Cache', DEBUG);
      const res = await requestService.callOSSIndexOrGetFromCache(this.results, format);
      logMessage('Success from OSS Index', DEBUG, res);
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Reticulating splines');
      logMessage('Turning response into Array<OssIndexServerResult>', DEBUG);
      let ossIndexResults: Array<OssIndexServerResult> = res.map((y: any) => {
        return new OssIndexServerResult(y);
      });
      logMessage('Response morphed into Array<OssIndexServerResult>', DEBUG, {
        ossIndexServerResults: ossIndexResults,
      });
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Removing whitelisted vulnerabilities');
      logMessage('Response being ran against whitelist', DEBUG, { ossIndexServerResults: ossIndexResults });
      ossIndexResults = await filterVulnerabilities(ossIndexResults);
      logMessage('Response has been whitelisted', DEBUG, { ossIndexServerResults: ossIndexResults });
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Auditing your results from Sonatype OSS Index');
      logMessage('Instantiating OSS Index Request Service, with quiet option', DEBUG, { quiet: args.quiet });
      const auditOSSIndex = new AuditOSSIndex(
        args.quiet ? true : false,
        args.json ? true : false,
        args.xml ? true : false,
      );
      this.spinner.maybeStop();

      logMessage('Attempting to audit results', DEBUG);
      const failed = auditOSSIndex.auditResults(ossIndexResults);

      logMessage('Results audited', DEBUG, { failureCode: failed });
      getAppLogger().end();
      getAppLogger().on('finish', () => {
        failed ? process.exit(1) : process.exit(0);
      });
    } catch (e) {
      this.spinner.maybeStop();
      logMessage('There was an error auditing with Sonatype OSS Index', ERROR, { title: e.message, stack: e.stack });
      getAppLogger().end();
      getAppLogger().on('finish', () => {
        process.exit(1);
      });
    }
  }

  private async auditWithIQ(args: any): Promise<void> {
    try {
      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Authenticating with Sonatype IQ');
      logMessage('Attempting to connect to Sonatype IQ', DEBUG, args.application);
      const requestService = this.getIqRequestService(args);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Submitting your dependencies');
      logMessage('Submitting SBOM to Sonatype IQ', DEBUG, this.sbom);
      const resultUrl = await requestService.submitToThirdPartyAPI(this.sbom);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Checking for results (this could take a minute)');
      logMessage('Polling IQ for report results', DEBUG, resultUrl);

      requestService.asyncPollForResults(
        `${resultUrl}`,
        (e) => {
          this.spinner.maybeFail();
          logMessage('There was an issue auditing your application!', ERROR, { title: e.message });
          process.exit(1);
        },
        (x) => {
          this.spinner.maybeSucceed();
          this.spinner.maybeCreateMessageForSpinner('Auditing your results');
          const results: ReportStatus = Object.assign(new ReportStatus(), x);
          logMessage('Sonatype IQ results obtained!', DEBUG, results);

          const auditResults = new AuditIQServer();

          this.spinner.maybeStop();
          logMessage('Auditing results', DEBUG, results);
          const failure = auditResults.auditThirdPartyResults(results);
          logMessage('Audit finished', DEBUG, { failure: failure });

          failure ? process.exit(1) : process.exit(0);
        },
      );
    } catch (e) {
      this.spinner.maybeFail();
      logMessage('There was an issue auditing your application!', ERROR, { title: e.message, stack: e.stack });
      process.exit(1);
    }
  }

  private getOssIndexRequestService(args: any): OssIndexRequestService {
    if (args.user && args.password) {
      return new OssIndexRequestService(args?.user, args?.password);
    }
    try {
      const config = new OssIndexServerConfig();

      config.getConfigFromFile();

      return new OssIndexRequestService(config.getUsername(), config.getToken());
    } catch (e) {
      return new OssIndexRequestService();
    }
  }

  private getIqRequestService(args: any): IqRequestService {
    const config = new IqServerConfig();
    //config.getConfigFromFile();
    if (!config.exists() && !(args.user && args.password && args.server))
      throw new Error(
        'No config file is defined and you are missing one of the -h (host), -u (user), or -p (password) parameters.',
      );

    return new IqRequestService(
      args.user !== undefined ? (args.user as string) : config.getUsername(),
      args.password !== undefined ? (args.password as string) : config.getToken(),
      args.server !== undefined ? (args.server as string) : config.getHost(),
      args.application as string,
      args.stage as string,
      args.timeout as number,
    );
  }
}
