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
import { homedir } from 'os';
import path from 'path';

import { textSync } from 'figlet';
import ora from 'ora';
import winston, { Logger, format } from 'winston';

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

const pack = require('../../package.json');

const transports = {
  console: new winston.transports.Console(
    {
      level: 'error'
    }
  ),
  file: new winston.transports.File(
    {
      filename: path.join(homedir(), '.ossindex', '.audit-js.error.log'), 
      level: 'error'
    }
  ),
  combinedFile: new winston.transports.File(
    {
      filename: path.join(homedir(), '.ossindex', '.audit-js.combined.log')
    }
  )
};

export class Application {
  private results: Array<Coordinates> = new Array();
  private sbom: string = "";
  private muncher: Muncher;
  private spinner?: ora.Ora;
  private logger: Logger;

  constructor(devDependency: boolean = false) {
    this.logger = winston.createLogger({
      level: 'debug',
      format: 
        format.combine(format.label({label: 'AuditJS'}),
        format.timestamp(),
        format.prettyPrint()),
      transports: [
        transports.file,
        transports.combinedFile,
        transports.console
      ]
    });

    let npmList = new NpmList(devDependency);
    let yarnLock = new YarnLock(devDependency);
    let bower = new Bower();

    if (npmList.isValid()) {
      this.logger.debug('Setting Muncher to npm list');
      this.muncher = npmList;
    } 
    else if (yarnLock.isValid()) {
      this.logger.debug('Setting Muncher to yarn lock');
      this.muncher = yarnLock;
    } else if (bower.isValid()) {
      this.logger.debug('Setting Muncher to bower');
      this.muncher = bower;
    }
    else {
      this.logger.error('Could not instantiate muncher');
      throw new Error("Could not instantiate muncher");
    }
  }

  public async startApplication(args: any) {
    if (args.verbose) {
      transports.console.level = 'debug';
    }

    if (args.json) {
      if (args._[0] == 'iq') {
        this.logger.debug('Attempting to start application');
        this.logger.debug('Getting coordinates for Nexus IQ Server');
        await this.populateCoordinatesForIQ();
        this.logger.debug(`Coordinates obtained`, this.sbom);
        this.logger.debug(`Auditing application`, args.application);
        await this.auditWithIQ(args);
      } else if (args._[0] == 'ossi') {
        this.logger.debug('Attempting to start application');
        this.logger.debug('Getting coordinates for Sonatype OSS Index');
        await this.populateCoordinates();
        this.logger.debug(`Coordinates obtained`, this.results);
  
        this.logger.debug('Auditing your application with Sonatype OSS Index');
        await this.auditWithOSSIndex(args);
      }
    }
    // args has sensitive info in it, such as username/password, etc... do not log them in total
    if (args._[0] == 'iq') {
      this.printHeader(args);
      this.logger.debug('Attempting to start application');
      this.spinner = ora("Starting application").start()
      this.spinner?.succeed()
      this.logger.debug('Getting coordinates for Nexus IQ Server');
      this.spinner?.start('Getting coordinates for Nexus IQ Server');
      await this.populateCoordinatesForIQ();
      this.logger.debug(`Coordinates obtained`, this.sbom);

      this.spinner.succeed();
      this.logger.debug(`Auditing application`, args.application);
      this.spinner.start('Auditing your application with Nexus IQ Server');
      await this.auditWithIQ(args);
    } else if (args._[0] == 'ossi') {
      this.printHeader(args);

      this.logger.debug('Attempting to start application');
      this.spinner = ora("Starting application").start()
      this.spinner?.succeed()

      this.logger.debug('Getting coordinates for Sonatype OSS Index');
      this.spinner?.start('Getting coordinates for Sonatype OSS Index');
      await this.populateCoordinates();
      this.logger.debug(`Coordinates obtained`, this.results);

      this.spinner?.succeed();
      this.logger.debug('Auditing your application with Sonatype OSS Index');
      this.spinner?.start('Auditing your application with Sonatype OSS Index');
      await this.auditWithOSSIndex(args);
    } else {
      process.exit(0);
    }
  }

  private printHeader(args: any) {
    if (args.artie) {
      console.log(textSync(`ArtieJS`, { font: 'Ghost' }));
      console.log(textSync(pack.version, { font: 'Ghost'}));
    } else {
      console.log(textSync(`AuditJS`, { font: '3D-ASCII' }));
      console.log(textSync(pack.version, { font: '3D-ASCII'}));
    }
  }

  private async populateCoordinates() {
    try {
      this.logger.debug('Trying to get dependencies from Muncher');
      this.results = await this.muncher.getDepList();
      this.logger.debug('Successfully got dependencies from Muncher');
    } catch(e) {
      let title = e.message;
      let stack = e.stack;
      this.logger.error(`An error was encountered while gathering your dependencies.`, {title, stack});
      process.exit(1);
    }
  }

  private async populateCoordinatesForIQ() {
    try {
      this.logger.debug('Trying to get sbom from cyclonedx/bom');
      this.sbom = await this.muncher.getSbomFromCommand();
      this.logger.debug('Successfully got sbom from cyclonedx/bom');
    } catch(e) {
      let title = e.message;
      let stack = e.stack;
      this.logger.error(`An error was encountered while gathering your dependencies into an SBOM`, {title, stack});
      process.exit(1);
    }
  }

  private async auditWithOSSIndex(args: any) {
    if (args.json) {
      await this.auditWithOSSIndexJson(args);
    }
    this.logger.debug('Instantiating OSS Index Request Service');
    let requestService = new OssIndexRequestService(args?.user, args?.password);
    this.spinner?.succeed();
    this.logger.debug('Submitting coordinates to Sonatype OSS Index');
    this.spinner?.start('Submitting coordinates to Sonatype OSS Index');
    let format = (this.muncher instanceof Bower) ? "bower" : "npm";
    this.logger.debug('Format to query OSS Index picked', format);
    try {
      this.logger.debug('Attempting to query OSS Index or use Cache');
      let res = await requestService.callOSSIndexOrGetFromCache(this.results, format);
      this.logger.debug('Success from OSS Index', res);
      this.spinner?.succeed();
      this.spinner?.start('Reticulating splines');
      this.logger.debug('Turning response into Array<OssIndexServerResult>');
      let ossIndexResults: Array<OssIndexServerResult> = res.map((y: any) => {
        return new OssIndexServerResult(y);
      });
      this.logger.debug('Response morphoned into Array<OssIndexServerResult>', ossIndexResults);
  
      this.spinner?.succeed();
      this.spinner?.start('Auditing your results from Sonatype OSS Index');
      this.logger.debug('Instantiating OSS Index Request Service, with quiet option', args.quiet);
      let auditOSSIndex = new AuditOSSIndex((args.quiet) ? true : false);
      this.spinner?.stop();
      this.logger.debug('Attempting to audit results');
      let failed = auditOSSIndex.auditResults(ossIndexResults);
      this.logger.debug('Results audited', failed);
      this.logger.on('finish', () => {
        (failed) ? process.exit(1) : process.exit(0);
      });
    } catch (e) {
      this.spinner?.stop();
      let title = e.message;
      let stack = e.stack;
      this.logger.error('There was an error auditing with Sonatype OSS Index', {title, stack});
      this.logger.end();
      this.logger.on('finish', () => {
        process.exit(1);
      });
    }
  }

  private async auditWithOSSIndexJson(args: any) {
    let requestService = new OssIndexRequestService(args?.user, args?.password);
    let format = (this.muncher instanceof Bower) ? "bower" : "npm";
    let res = await requestService.callOSSIndexOrGetFromCache(this.results, format);
    let ossIndexResults: Array<OssIndexServerResult> = res.map((y: any) => {
      return new OssIndexServerResult(y);
    });

    let auditOSSIndex = new AuditOSSIndex((args.quiet) ? true : false, true);
    let failed = auditOSSIndex.auditResults(ossIndexResults);
    (failed) ? process.exit(1) : process.exit(0);
  }

  private async auditWithIQ(args: any) {
    let requestService = new IqRequestService(
      args.user as string, 
      args.password as string, 
      args.server as string, 
      args.application as string,
      args.stage as string);
    
    try {
      this.spinner?.succeed();
      this.spinner?.start('Getting your internal application ID');
      let id = await requestService.getApplicationInternalId();

      this.spinner?.succeed();
      this.spinner?.start('Submitting your dependencies to Nexus IQ Server');
      let resultUrl = await requestService.submitToThirdPartyAPI(this.sbom, id);
      
      this.spinner?.succeed();
      this.spinner?.start('Checking for results (this could take a minute)');
      requestService.asyncPollForResults(`${args.server}/${resultUrl}`, (x) => {
        this.spinner?.succeed();
        this.spinner?.start('Auditing your results');
        const results: ReportStatus = Object.assign(new ReportStatus(), x);
        let auditResults = new AuditIQServer();

        this.spinner?.stop();
        let failure = auditResults.auditThirdPartyResults(results);

        (failure) ? process.exit(1) : process.exit(0);
      });
    } catch (e) {
      this.spinner?.fail();
      console.group();
      console.error(e.message);
      console.groupEnd();
    }
  }
}
