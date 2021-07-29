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

import expect from '../Tests/TestHelper';
import { Application } from './Application';
import sinon, { SinonStub } from 'sinon';
import { OssIndexRequestService } from '../Services/OssIndexRequestService';
import { OssIndexServerConfig } from '../Config/OssIndexServerConfig';
import { TextFormatter } from '../Audit/Formatters/TextFormatter';

describe('Application', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('merges both CLI and config options for auditWithOSSIndex, with CLI taking precedence', async () => {
    const app = new Application(false, true);
    const yargs = {
      _: ['ossi'],
      user: '',
      password: 'cli-password',
      cache: '',
    };

    sinon.stub(TextFormatter.prototype, 'printAuditResults');
    sinon.stub(OssIndexServerConfig.prototype, 'getConfigFromFile');
    sinon.stub(OssIndexServerConfig.prototype, 'getUsername').returns('config-user');
    sinon.stub(OssIndexServerConfig.prototype, 'getToken').returns('config-password');
    sinon.stub(OssIndexServerConfig.prototype, 'getCacheLocation').returns('config-cache-location');
    let ossIndexRequestService: any = null;
    sinon
      .stub(OssIndexRequestService.prototype, 'callOSSIndexOrGetFromCache')
      .callsFake(async function(this: any): Promise<any> {
        ossIndexRequestService = this;
        return [
          {
            coordinates: '',
            reference: '',
            vulnerabilities: [],
          },
        ];
      });
    await app.startApplication(yargs);
    sinon.assert.calledOnce(OssIndexRequestService.prototype.callOSSIndexOrGetFromCache as SinonStub);
    expect(ossIndexRequestService).is.instanceOf(OssIndexRequestService);
    if (ossIndexRequestService instanceof OssIndexRequestService) {
      expect(ossIndexRequestService.user).to.equal('config-user');
      expect(ossIndexRequestService.password).to.equal('cli-password');
      expect(ossIndexRequestService.cacheLocation).to.equal('config-cache-location');
    }
  });
});
