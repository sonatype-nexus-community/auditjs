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
import { YarnLock } from '../Munchers/YarnLock';
import { Bower } from '../Munchers/Bower';
import { setConsoleTransportLevel, logMessage, createAppLogger, DEBUG, ERROR, getAppLogger } from './Logger/Logger';
import { Spinner } from './Spinner/Spinner';

const pack = require('../../package.json');

export class Application {
  private results: Array<Coordinates> = new Array();
  private sbom: string = "";
  private muncher: Muncher;
  private spinner: Spinner;

  constructor(
    readonly devDependency: boolean = false, 
    readonly silent: boolean = false,
    readonly artie: boolean = false
    ) {
    createAppLogger();
    let npmList = new NpmList(devDependency);
    let yarnLock = new YarnLock(devDependency);
    let bower = new Bower();

    this.printHeader();
    this.spinner = new Spinner(silent);

    if (npmList.isValid()) {
      logMessage('Setting Muncher to npm list', DEBUG);
      this.muncher = npmList;
    } 
    else if (yarnLock.isValid()) {
      logMessage('Setting Muncher to yarn lock', DEBUG)
      this.muncher = yarnLock;
    } else if (bower.isValid()) {
      logMessage('Setting Muncher to bower', DEBUG);
      this.muncher = bower;
    }
    else {
      logMessage('Could not instantiate muncher', 'error');
      throw new Error("Could not instantiate muncher");
    }
  }

  public async startApplication(args: any) {
    if (args.verbose) {
      setConsoleTransportLevel(DEBUG);
    }
    // args has sensitive info in it, such as username/password, etc... do not log them in total
    if (args._[0] == 'iq') {
      logMessage('Attempting to start application', DEBUG);
      logMessage('Getting coordinates for Nexus IQ Server', DEBUG);
      this.spinner.maybeCreateMessageForSpinner('Getting coordinates for Nexus IQ Server');
      await this.populateCoordinatesForIQ();
      logMessage(`Coordinates obtained`, DEBUG, this.sbom);

      this.spinner.maybeSucceed();
      logMessage(`Auditing application`, DEBUG, args.application);
      this.spinner.maybeCreateMessageForSpinner('Auditing your application with Nexus IQ Server');
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

  private printHeader() {
    if (this.silent) {
      return;
    }
    else if (this.artie) {
      this.doPrintHeader('ArtieJS', 'Ghost');
    } else {
      this.doPrintHeader();
    }
  }

  private doPrintHeader(title: string = 'AuditJS', font: figlet.Fonts = '3D-ASCII') {
    console.log(textSync(title, { font: font }));
    console.log(textSync(pack.version, { font: font}));
  }

  private async populateCoordinates() {
    try {
      logMessage('Trying to get dependencies from Muncher', DEBUG);
      this.results = await this.muncher.getDepList();
      logMessage('Successfully got dependencies from Muncher', DEBUG);
    } catch(e) {
      logMessage(`An error was encountered while gathering your dependencies.`, ERROR, {title: e.message, stack: e.stack});
      process.exit(1);
    }
  }

  private async populateCoordinatesForIQ() {
    try {
      logMessage('Trying to get sbom from cyclonedx/bom', DEBUG);
      this.sbom = await this.muncher.getSbomFromCommand();
      logMessage('Successfully got sbom from cyclonedx/bom', DEBUG);
    } catch(e) {
      logMessage(`An error was encountered while gathering your dependencies into an SBOM`, ERROR, {title: e.message, stack: e.stack});
      process.exit(1);
    }
  }

  private async auditWithOSSIndex(args: any) {
    logMessage('Instantiating OSS Index Request Service', DEBUG);
    let requestService = new OssIndexRequestService(args?.user, args?.password);
    this.spinner.maybeSucceed();

    logMessage('Submitting coordinates to Sonatype OSS Index', DEBUG);
    this.spinner.maybeCreateMessageForSpinner('Submitting coordinates to Sonatype OSS Index');

    let format = (this.muncher instanceof Bower) ? "bower" : "npm";
    logMessage('Format to query OSS Index picked', DEBUG, {format: format});
    try {
      logMessage('Attempting to query OSS Index or use Cache', DEBUG);
      let res = await requestService.callOSSIndexOrGetFromCache(this.results, format);
      logMessage('Success from OSS Index', DEBUG, res);
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Reticulating splines');
      logMessage('Turning response into Array<OssIndexServerResult>', DEBUG);
      let ossIndexResults: Array<OssIndexServerResult> = res.map((y: any) => {
        return new OssIndexServerResult(y);
      });
      logMessage('Response morphed into Array<OssIndexServerResult>', DEBUG, { ossIndexServerResults: ossIndexResults });
      this.spinner.maybeSucceed();

      this.spinner.maybeCreateMessageForSpinner('Auditing your results from Sonatype OSS Index');
      logMessage('Instantiating OSS Index Request Service, with quiet option', DEBUG, { quiet: args.quiet });
      let auditOSSIndex = new AuditOSSIndex((args.quiet) ? true : false, (args.json) ? true : false);
      this.spinner.maybeStop();

      logMessage('Attempting to audit results', DEBUG);
      let failed = auditOSSIndex.auditResults(ossIndexResults);

      logMessage('Results audited', DEBUG, { failureCode: failed });
      getAppLogger().on('finish', () => {
        (failed) ? process.exit(1) : process.exit(0);
      });
    } catch (e) {
      this.spinner.maybeStop();
      logMessage('There was an error auditing with Sonatype OSS Index', ERROR, {title: e.message, stack: e.stack});
      getAppLogger().end();
      getAppLogger().on('finish', () => {
        process.exit(1);
      });
    }
  }

  private async auditWithIQ(args: any) {
    let requestService = new IqRequestService(
      args.user as string, 
      args.password as string, 
      args.server as string, 
      args.application as string,
      args.stage as string);
    
    try {
      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Getting your internal application ID');
      logMessage('Attempting to obtain Nexus IQ Server internal applciation ID', DEBUG, args.application);
      let id = await requestService.getApplicationInternalId();
      logMessage('Internal ID obtained', DEBUG, id);

      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Submitting your dependencies to Nexus IQ Server');
      logMessage('Submitting sbom to Nexus IQ Server third party API', DEBUG, this.sbom, id);
      let resultUrl = await requestService.submitToThirdPartyAPI(this.sbom, id);
      
      this.spinner.maybeSucceed();
      this.spinner.maybeCreateMessageForSpinner('Checking for results (this could take a minute)');
      logMessage('Polling Nexus IQ Server for report results', DEBUG, resultUrl);
      requestService.asyncPollForResults(`${args.server}/${resultUrl}`, (x) => {
        this.spinner.maybeSucceed();
        this.spinner.maybeCreateMessageForSpinner('Auditing your results');
        const results: ReportStatus = Object.assign(new ReportStatus(), x);
        logMessage('Results from Nexus IQ Server obtained', DEBUG, results);

        let auditResults = new AuditIQServer();

        this.spinner.maybeStop();
        logMessage('Auditing results', DEBUG, results);
        let failure = auditResults.auditThirdPartyResults(results);
        logMessage('Audit finished', DEBUG, { failure: failure });

        (failure) ? process.exit(1) : process.exit(0);
      });
    } catch (e) {
      this.spinner.maybeFail();
      logMessage('There was an issue auditing your application with Nexus IQ Server', ERROR, {title: e.message, stack: e.stack});
      process.exit(1);
    }
  }
}
