import expect from '../Tests/TestHelper';
import { Application } from './Application';
import sinon, { SinonStub } from 'sinon';
import { OssIndexRequestService } from '../Services/OssIndexRequestService';
import { Coordinates } from '../Types/Coordinates';
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
      .callsFake(async function(this: any, data: Coordinates[], format = 'npm'): Promise<any> {
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
