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

import figlet = require('figlet');

import { IqRequestService } from '../Services/IqRequestService';
import { NpmList } from '../Munchers/NpmList';
import { Coordinates } from '../Types/Coordinates';
import { Muncher } from '../Munchers/Muncher';
import { OssIndexRequestService } from '../Services/OssIndexRequestService';
import { GuideRequestService } from '../Services/GuideRequestService';
import type { RecommendationResponse } from '@sonatype/sonatype-guide-api-client';
import { AuditIQServer } from '../Audit/AuditIQServer';
import { AuditOSSIndex } from '../Audit/AuditOSSIndex';
import { OssIndexServerResult, OssIndexServerResultJSON } from '../Types/OssIndexServerResult';
import { ReportStatus } from '../Types/ReportStatus';
import { Bower } from '../Munchers/Bower';
import { DEBUG, ERROR, logMessage, createAppLogger, shutDownLoggerAndExit } from './Logger/Logger';
import { Spinner } from './Spinner/Spinner';
import { filterVulnerabilities } from '../Whitelist/VulnerabilityExcluder';
import { IqServerConfig } from '../Config/IqServerConfig';
import { OssIndexServerConfig } from '../Config/OssIndexServerConfig';
import { GuideServerConfig } from '../Config/GuideServerConfig';
import { visuallySeperateText } from '../Visual/VisualHelper';
const pj = require('../../package.json');

export interface CliArgs {
  _: (string | number)[];
  user?: string;
  password?: string;
  token?: string;
  server?: string;
  host?: string;
  quiet?: boolean;
  json?: boolean;
  xml?: boolean;
  allowlist?: string;
  whitelist?: string;
  cache?: string;
  application?: string;
  stage?: string;
  timeout?: number;
  insecure?: boolean;
  dev?: boolean;
  recommend?: boolean;
}

export class Application {
  private results: Array<Coordinates> = [];
  private sbom = '';
  private muncher: Muncher;
  private spinner: Spinner;

  constructor(
    readonly devDependency: boolean = false,
    readonly silent: boolean = false,
    readonly artie: boolean = false,
    readonly allen: boolean = false,
    readonly scanBower: boolean = false,
  ) {
    const npmList = new NpmList(devDependency);
    const bower = new Bower(devDependency);

    this.printHeader();
    this.spinner = new Spinner(silent);
    createAppLogger();

    if (npmList.isValid() && !this.scanBower) {
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

  public async startApplication(args: CliArgs): Promise<void> {
    if (args._[0] == 'iq' || args._[0] == 'lifecycle') {
      logMessage('Attempting to start application', DEBUG);
      logMessage('Getting coordinates for Sonatype Lifecycle', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Sonatype Lifecycle');
      await this.populateCoordinatesForIQ();
      logMessage(`Coordinates obtained`, DEBUG, this.sbom);

      this.spinner.maybeSucceed();
      logMessage(`Auditing application`, DEBUG, args.application);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Sonatype Lifecycle');
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
    } else if (args._[0] == 'guide') {
      logMessage('Attempting to start application', DEBUG);

      logMessage('Getting coordinates for Sonatype Guide', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Sonatype Guide');
      await this.populateCoordinates();
      logMessage(`Coordinates obtained`, DEBUG, this.results);

      this.spinner.maybeSucceed();
      logMessage('Auditing your application with Sonatype Guide', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Sonatype Guide');
      await this.auditWithGuide(args);
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

  private doPrintHeader(title = 'AuditJS', font = '3D-ASCII'): void {
    console.log(figlet.textSync(title, { font: font, horizontalLayout: 'fitted' }));
    console.log(figlet.textSync('By Sonatype & Friends', { font: 'Pepper' }));
    visuallySeperateText(false, [`${title} version: ${pj.version}`]);
  }

  private async populateCoordinates(): Promise<void> {
    try {
      logMessage('Trying to get dependencies from Muncher', DEBUG);
      this.results = await this.muncher.getDepList();
      logMessage('Successfully got dependencies from Muncher', DEBUG);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logMessage(`An error was encountered while gathering your dependencies.`, ERROR, {
        title: err.message,
        stack: err.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async populateCoordinatesForIQ(): Promise<void> {
    try {
      logMessage('Trying to get sbom from cyclonedx/bom', DEBUG);
      this.sbom = await this.muncher.getSbomFromCommand();
      logMessage('Successfully got sbom from cyclonedx/bom', DEBUG);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logMessage(`An error was encountered while gathering your dependencies into an SBOM`, ERROR, {
        title: err.message,
        stack: err.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async auditWithOSSIndex(args: CliArgs): Promise<void> {
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
      let ossIndexResults: Array<OssIndexServerResult> = res.map((y: OssIndexServerResultJSON) => {
        return new OssIndexServerResult(y);
      });
      logMessage('Response morphed into Array<OssIndexServerResult>', DEBUG, {
        ossIndexServerResults: ossIndexResults,
      });
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Removing whitelisted vulnerabilities');
      logMessage('Response being ran against whitelist', DEBUG, { ossIndexServerResults: ossIndexResults });
      ossIndexResults = await filterVulnerabilities(ossIndexResults, args.whitelist);
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
      if (failed) {
        shutDownLoggerAndExit(1);
      } else {
        shutDownLoggerAndExit(0);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.spinner.maybeStop();
      logMessage('There was an error auditing with Sonatype OSS Index', ERROR, {
        title: err.message,
        stack: err.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private async auditWithGuide(args: CliArgs): Promise<void> {
    logMessage('Instantiating Guide Request Service', DEBUG);
    const requestService = this.getGuideRequestService(args);
    this.spinner.maybeSucceed();

    logMessage('Submitting coordinates to Sonatype Guide', DEBUG);
    this.spinner.maybeCreateMessageForSpinner('Submitting coordinates to Sonatype Guide');

    const format = this.muncher instanceof Bower ? 'bower' : 'npm';
    logMessage('Format to query Sonatype Guide picked', DEBUG, { format: format });
    try {
      logMessage('Attempting to query Sonatype Guide or use Cache', DEBUG);
      const res = await requestService.callGuideOrGetFromCache(this.results, format);
      logMessage('Success from Sonatype Guide', DEBUG, res);
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Reticulating splines');
      logMessage('Turning response into Array<OssIndexServerResult>', DEBUG);
      let guideResults: Array<OssIndexServerResult> = res.map((y: OssIndexServerResultJSON) => {
        return new OssIndexServerResult(y);
      });
      logMessage('Response morphed into Array<OssIndexServerResult>', DEBUG, {
        ossIndexServerResults: guideResults,
      });
      this.spinner.maybeSucceed();

      const allowlistPath = args.allowlist || args.whitelist;
      this.spinner.maybeCreateMessageForSpinner('Removing allowlisted vulnerabilities');
      logMessage('Response being ran against allowlist', DEBUG, { ossIndexServerResults: guideResults });
      guideResults = await filterVulnerabilities(guideResults, allowlistPath);
      logMessage('Response has been filtered', DEBUG, { ossIndexServerResults: guideResults });
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Auditing your results from Sonatype Guide');
      logMessage('Instantiating AuditOSSIndex, with quiet option', DEBUG, { quiet: args.quiet });
      const auditGuide = new AuditOSSIndex(
        args.quiet ? true : false,
        args.json ? true : false,
        args.xml ? true : false,
      );
      this.spinner.maybeStop();

      logMessage('Attempting to audit results', DEBUG);
      const failed = auditGuide.auditResults(guideResults);
      logMessage('Results audited', DEBUG, { failureCode: failed });

      if (args.recommend && !args.json && !args.xml) {
        const vulnerablePurls = guideResults
          .filter((r) => r.vulnerabilities && r.vulnerabilities.length > 0)
          .map((r) => r.coordinates);

        if (vulnerablePurls.length > 0) {
          this.spinner.maybeCreateMessageForSpinner('Fetching Sonatype Guide recommendations');
          logMessage('Fetching recommendations for vulnerable packages', DEBUG, { count: vulnerablePurls.length });
          const recommendations = await requestService.getRecommendations(vulnerablePurls);
          this.spinner.maybeStop();
          this.printRecommendations(recommendations);
        }
      }

      if (failed) {
        shutDownLoggerAndExit(1);
      } else {
        shutDownLoggerAndExit(0);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.spinner.maybeStop();
      logMessage('There was an error auditing with Sonatype Guide', ERROR, {
        title: err.message,
        stack: err.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private printRecommendations(recommendations: Map<string, RecommendationResponse>): void {
    if (recommendations.size === 0) return;

    const cols = Math.min(process.stdout.columns || 80, 80);
    const line = '-'.repeat(cols);

    console.log('\n' + line);
    console.log('Sonatype Guide Recommendations:');
    console.log(line);

    for (const [purl, rec] of recommendations) {
      const top = rec.toVersions?.[0];
      if (!top?.version) continue;

      const displayPurl = purl.replace('%40', '@');
      const fromDts = rec.fromVersion?.developerTrustScore?.toFixed(1) ?? 'N/A';
      const toDts = top.developerTrustScore?.toFixed(1) ?? 'N/A';

      const countVulns = (vulns?: { [key: string]: number }): number =>
        vulns ? Object.values(vulns).reduce((s, n) => s + n, 0) : 0;

      const fromVulnCount = countVulns(rec.fromVersion?.directVulnerabilities);
      const toVulnCount = countVulns(top.directVulnerabilities);

      console.log(`\n  ${displayPurl}`);
      console.log(
        `    Current:    ${rec.fromVersion?.version ?? '?'} (DTS: ${fromDts}, ${fromVulnCount} direct vuln(s))`,
      );
      console.log(`    Upgrade to: ${top.version} (DTS: ${toDts}, ${toVulnCount} direct vuln(s))`);

      if (top.breakingChangesCount && top.breakingChangesCount !== '0') {
        console.log(`    Note: ~${top.breakingChangesCount} breaking changes`);
      }
    }

    console.log('\n' + line + '\n');
  }

  private async auditWithIQ(args: CliArgs): Promise<void> {
    try {
      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Authenticating with Sonatype Lifecycle');
      logMessage('Attempting to connect to Sonatype Lifecycle', DEBUG, args.application);
      const requestService = this.getIqRequestService(args);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Submitting your dependencies');
      logMessage('Submitting SBOM to Sonatype Lifecycle', DEBUG, this.sbom);
      const resultUrl = await requestService.submitToThirdPartyAPI(this.sbom);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Checking for results (this could take a minute)');
      logMessage('Polling Lifecycle for report results', DEBUG, resultUrl);

      requestService.asyncPollForResults(
        `${resultUrl}`,
        (e) => {
          this.spinner.maybeFail();
          logMessage('There was an issue auditing your application!', ERROR, { title: e.message, stack: e.stack });
          shutDownLoggerAndExit(1);
        },
        (x) => {
          this.spinner.maybeSucceed();
          this.spinner.maybeCreateMessageForSpinner('Auditing your results');
          const results: ReportStatus = Object.assign(new ReportStatus(), x);
          logMessage('Sonatype Lifecycle results obtained!', DEBUG, results);

          results.reportHtmlUrl = new URL(results.reportHtmlUrl!, requestService.host).href;

          const auditResults = new AuditIQServer();

          this.spinner.maybeStop();
          logMessage('Auditing results', DEBUG, results);
          const failure = auditResults.auditThirdPartyResults(results);
          logMessage('Audit finished', DEBUG, { failure: failure });

          if (failure) {
            shutDownLoggerAndExit(1);
          } else {
            shutDownLoggerAndExit(0);
          }
        },
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.spinner.maybeFail();
      logMessage('There was an issue auditing your application!', ERROR, {
        title: err.message,
        stack: err.stack,
      });
      shutDownLoggerAndExit(1);
    }
  }

  private getOssIndexRequestService(args: CliArgs): OssIndexRequestService {
    let config;
    try {
      config = new OssIndexServerConfig();
      config.getConfigFromFile();
    } catch {
      // Ignore config load failure
    }
    return new OssIndexRequestService(
      args?.user || config?.getUsername(),
      args?.password || config?.getToken(),
      args?.cache || config?.getCacheLocation(),
      args?.server || config?.getServer(),
    );
  }

  private getGuideRequestService(args: CliArgs): GuideRequestService {
    let config: GuideServerConfig | undefined;
    try {
      config = new GuideServerConfig();
      if (config.exists()) config.getConfigFromFile();
    } catch {
      // Ignore config load failure
    }

    const username = args?.user || process.env.AUDITJS_GUIDE_USERNAME || config?.getUsername();
    // Bearer token: used when no username is present.
    // Fall back to config Token for backward compat with configs saved before AccessToken field existed.
    const accessToken = !username
      ? args?.token || process.env.AUDITJS_GUIDE_TOKEN || config?.getAccessToken() || config?.getToken()
      : undefined;

    return new GuideRequestService(
      username,
      args?.token || args?.password || process.env.AUDITJS_GUIDE_TOKEN || config?.getToken(),
      args?.cache,
      args?.server || config?.getServer?.(),
      accessToken,
    );
  }

  private getIqRequestService(args: CliArgs): IqRequestService {
    const config = new IqServerConfig();
    const hasCredentials =
      (args.user || process.env.AUDITJS_LIFECYCLE_USER) &&
      (args.password || process.env.AUDITJS_LIFECYCLE_TOKEN) &&
      (args.server || process.env.AUDITJS_LIFECYCLE_URL);
    if (!config.exists() && !hasCredentials)
      throw new Error(
        'No config file is defined and you are missing one of the -h (host), -u (user), or -p (password) parameters.',
      );

    return new IqRequestService(
      args.user ?? process.env.AUDITJS_LIFECYCLE_USER ?? config.getUsername(),
      args.password ?? process.env.AUDITJS_LIFECYCLE_TOKEN ?? config.getToken(),
      args.server ?? process.env.AUDITJS_LIFECYCLE_URL ?? config.getHost(),
      args.application as string,
      args.stage as string,
      args.timeout as number,
      args.insecure as boolean,
    );
  }
}
