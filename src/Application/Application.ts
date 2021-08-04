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

import { textSync } from 'figlet';
import { NpmList } from '../Munchers/NpmList';
import { Muncher } from '../Munchers/Muncher';
import {
  OSSIndexRequestService,
  ILogger,
  IqRequestService,
  IqThirdPartyAPIServerPollingResult,
} from '@sonatype/js-sona-types';
import { AuditIQServer } from '../Audit/AuditIQServer';
import { AuditOSSIndex } from '../Audit/AuditOSSIndex';
import { Bower } from '../Munchers/Bower';
import { DEBUG, ERROR, shutDownLoggerAndExit, Logger } from './Logger/Logger';
import storage from 'node-persist';
import { Spinner } from './Spinner/Spinner';
import { filterVulnerabilities } from '../IgnoreList/VulnerabilityExcluder';
import { IqServerConfig } from '../Config/IqServerConfig';
import { OssIndexServerConfig } from '../Config/OssIndexServerConfig';
import { visuallySeperateText } from '../Visual/VisualHelper';
import { AuditGraph } from '../Audit/AuditGraph';
import { join } from 'path';
import { homedir } from 'os';
import { PackageURL } from 'packageurl-js';
const pj = require('../../package.json');

export class Application {
  private results: Array<PackageURL> = [];
  private sbom = '';
  private muncher: Muncher;
  private spinner: Spinner;
  private logger: ILogger;
  private host = '';

  constructor(
    readonly devDependency: boolean = false,
    readonly silent: boolean = false,
    readonly artie: boolean = false,
    readonly allen: boolean = false,
    readonly scanBower: boolean = false,
  ) {
    this.logger = new Logger();
    const npmList = new NpmList(devDependency, this.logger);
    const bower = new Bower(devDependency);

    this.printHeader();
    this.spinner = new Spinner(silent);

    if (npmList.isValid() && !this.scanBower) {
      this.logger.logMessage('Setting Muncher to npm list', DEBUG);
      this.muncher = npmList;
    } else if (bower.isValid()) {
      this.logger.logMessage('Setting Muncher to bower', DEBUG);
      this.muncher = bower;
    } else {
      this.logger.logMessage(
        'Failed project directory validation.  Are you in a (built) node, yarn, or bower project directory?',
        'error',
      );
      throw new Error('Could not instantiate muncher');
    }
  }

  public async startApplication(args: any): Promise<void> {
    if (args._[0] == 'iq') {
      this.logger.logMessage('Attempting to start application', DEBUG);
      this.logger.logMessage('Getting coordinates for Sonatype IQ', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Sonatype IQ');
      await this.populateCoordinatesForIQ();
      this.logger.logMessage(`Coordinates obtained`, DEBUG, this.sbom);

      this.spinner.maybeSucceed();
      this.logger.logMessage(`Auditing application`, DEBUG, args.application);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Sonatype IQ');
      await this.auditWithIQ(args);
    } else if (args._[0] == 'ossi') {
      this.logger.logMessage('Attempting to start application', DEBUG);

      this.logger.logMessage('Getting coordinates for Sonatype OSS Index', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Sonatype OSS Index');
      await this.populatePurls();
      this.logger.logMessage(`Coordinates obtained`, DEBUG, this.results);

      this.spinner.maybeSucceed();
      this.logger.logMessage('Auditing your application with Sonatype OSS Index', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Sonatype OSS Index');
      await this.auditWithOSSIndex(args);
    } else if (args._[0] == 'sbom') {
      await this.populateCoordinatesForIQ();
      console.log(this.sbom);
    } else {
      shutDownLoggerAndExit(1);
    }
  }

  private printHeader(): void {
    if (this.silent) {
      return;
    } else if (this.artie) {
      this.doPrintHeader('ArtieJS', 'Ghost');
    } else if (this.allen) {
      this.doPrintHeader('AllenJS', 'Ghost');
    } else {
      this.doPrintHeader();
    }
  }

  private doPrintHeader(title = 'AuditJS', font: figlet.Fonts = '3D-ASCII'): void {
    console.log(textSync(title, { font: font, horizontalLayout: 'fitted' }));
    console.log(textSync('By Sonatype & Friends', { font: 'Pepper' }));
    visuallySeperateText(false, [`${title} version: ${pj.version}`]);
  }

  private async populatePurls(): Promise<void> {
    try {
      this.logger.logMessage('Trying to get dependencies from Muncher', DEBUG);
      this.results = await this.muncher.getInstalledDepsAsPurls();
      this.logger.logMessage('Successfully got dependencies from Muncher', DEBUG);
    } catch (e) {
      this.logger.logMessage(`An error was encountered while gathering your dependencies.`, ERROR, {
        title: e.message,
        stack: e.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async populateCoordinatesForIQ(): Promise<void> {
    try {
      this.logger.logMessage('Trying to get sbom from cyclonedx/bom', DEBUG);
      this.sbom = await this.muncher.getSbomFromCommand();
      this.logger.logMessage('Successfully got sbom from cyclonedx/bom', DEBUG);
    } catch (e) {
      this.logger.logMessage(`An error was encountered while gathering your dependencies into an SBOM`, ERROR, {
        title: e.message,
        stack: e.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async auditWithOSSIndex(args: any): Promise<void> {
    this.logger.logMessage('Instantiating OSS Index Request Service', DEBUG);
    const ossIndexService = await this.getOSSIndexRequestService(args);
    this.spinner.maybeSucceed();

    this.logger.logMessage('Submitting coordinates to Sonatype OSS Index', DEBUG);
    this.spinner.maybeCreateMessageForSpinner('Submitting coordinates to Sonatype OSS Index');

    const format = this.muncher instanceof Bower ? 'bower' : 'npm';
    this.logger.logMessage('Format to query OSS Index picked', DEBUG, { format: format });
    try {
      this.logger.logMessage('Attempting to query OSS Index or use Cache', DEBUG);
      const purls = await this.muncher.getInstalledDepsAsPurls();
      let res = await ossIndexService.getComponentDetails(purls);

      this.logger.logMessage('Success from OSS Index', DEBUG, res);
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Reticulating splines');
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Removing ignored vulnerabilities');
      this.logger.logMessage('Response being ran against ignore list', DEBUG, { ossIndexServerResults: res });
      res = await filterVulnerabilities(res, args.ignorelist);
      this.logger.logMessage('Response has been ran against ignore list', DEBUG, { ossIndexServerResults: res });
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Auditing your results from Sonatype OSS Index');
      this.logger.logMessage('Instantiating OSS Index Request Service, with quiet option', DEBUG, {
        quiet: args.quiet,
      });

      const graph = this.muncher.getGraph();
      const auditGraph = new AuditGraph(graph!);
      const auditOSSIndex = new AuditOSSIndex(
        args.quiet ? true : false,
        args.json ? true : false,
        args.xml ? true : false,
        auditGraph,
      );
      this.spinner.maybeStop();

      this.logger.logMessage('Attempting to audit results', DEBUG);
      const failed = auditOSSIndex.auditResults(res);

      this.logger.logMessage('Results audited', DEBUG, { failureCode: failed });
      failed ? shutDownLoggerAndExit(1) : shutDownLoggerAndExit(0);
    } catch (e) {
      this.spinner.maybeStop();
      this.logger.logMessage('There was an error auditing with Sonatype OSS Index', ERROR, {
        title: e.message,
        stack: e.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async auditWithIQ(args: any): Promise<void> {
    try {
      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Authenticating with Sonatype IQ');
      this.logger.logMessage('Attempting to connect to Sonatype IQ', DEBUG, args.application);
      const requestService = this.getIqRequestService(args);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Submitting your dependencies');
      this.logger.logMessage('Submitting SBOM to Sonatype IQ', DEBUG, this.sbom);
      const resultUrl = await requestService.submitToThirdPartyAPI(this.sbom);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Checking for results (this could take a minute)');
      this.logger.logMessage('Polling IQ for report results', DEBUG, resultUrl);

      requestService.asyncPollForResults(
        `${resultUrl}`,
        (e) => {
          this.spinner.maybeFail();
          this.logger.logMessage('There was an issue auditing your application!', ERROR, {
            title: e.message,
            stack: e.stack,
          });
          shutDownLoggerAndExit(1);
        },
        async (results: IqThirdPartyAPIServerPollingResult) => {
          this.spinner.maybeSucceed();
          this.spinner.maybeCreateMessageForSpinner('Auditing your results');

          this.logger.logMessage('Getting raw report results', DEBUG);
          const policyReportResults = await requestService.getPolicyReportResults(results.reportDataUrl!);

          this.logger.logMessage('Sonatype IQ results obtained!', DEBUG, results);

          results.reportHtmlUrl = new URL(results.reportHtmlUrl!, this.host).href;

          const graph = this.muncher.getGraph();
          const auditGraph = new AuditGraph(graph!);

          const auditResults = new AuditIQServer(auditGraph);

          this.spinner.maybeStop();
          this.logger.logMessage('Auditing results', DEBUG, results);

          const failure = auditResults.auditThirdPartyResults(results, policyReportResults);
          this.logger.logMessage('Audit finished', DEBUG, { failure: failure });

          failure ? shutDownLoggerAndExit(1) : shutDownLoggerAndExit(0);
        },
      );
    } catch (e) {
      this.spinner.maybeFail();
      this.logger.logMessage('There was an issue auditing your application!', ERROR, {
        title: e.message,
        stack: e.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async getOSSIndexRequestService(args: any): Promise<OSSIndexRequestService> {
    await storage.init({ dir: join(homedir(), '.ossindex', 'auditjs'), ttl: 12 * 60 * 60 * 1000 });

    const options = {
      browser: false,
      product: 'AuditJS',
      version: pj.version,
      logger: this.logger,
    };

    try {
      config = new OssIndexServerConfig();
      config.getConfigFromFile();
    } catch (e) {
      // Ignore config load failure
    }

    return new OSSIndexRequestService(
        { ...options,
          args?.user || config?.getUsername(),
          args?.password || config?.getToken(),
          args?.cache || config?.getCacheLocation()
        },
        storage as any,
      );
    } catch (e) {
      return new OSSIndexRequestService(options, storage as any);
    }
  }

  private getIqRequestService(args: any): IqRequestService {
    const config = new IqServerConfig();
    //config.getConfigFromFile();
    if (!config.exists() && !(args.user && args.password && args.server))
      throw new Error(
        'No config file is defined and you are missing one of the -h (host), -u (user), or -p (password) parameters.',
      );

    this.host = args.server !== undefined ? (args.server as string) : config.getHost();
    const token = args.password !== undefined ? (args.password as string) : config.getToken();
    const user = args.user !== undefined ? (args.user as string) : config.getUsername();

    const options = {
      browser: false,
      product: 'AuditJS',
      version: pj.version,
      logger: this.logger,
      host: this.host,
      user: user,
      token: token,
      application: args.application as string,
      stage: args.stage as string,
      timeout: args.timeout as number,
      insecure: args.insecure as boolean,
    };

    return new IqRequestService(options);
  }
}
