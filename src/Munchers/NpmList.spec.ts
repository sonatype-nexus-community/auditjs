/*
 * Copyright (c) 2020-present Sonatype, Inc.
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

import expect from '../Tests/TestHelper';
import { NpmList } from './NpmList';
import { Coordinates } from '../Types/Coordinates';

const cwd = process.cwd();

// this is bad(tm) and brittle, but I needed some sort of sanity check that my changes are indeed a refactor, and not a shot in the dark.
const expectedCoordinatesJson =
  '[{"name":"chalk","version":"3.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/chalk"},{"name":"ansi-styles","version":"4.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ansi-styles"},{"name":"color-name","version":"1.1.1","group":"@types","requestedBy":{},"pathOnDisk":"/node_modules/@types/color-name"},{"name":"color-convert","version":"2.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/color-convert"},{"name":"color-name","version":"1.1.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/color-name"},{"name":"supports-color","version":"7.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/chalk/node_modules/supports-color"},{"name":"has-flag","version":"4.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/chalk/node_modules/has-flag"},{"name":"colors","version":"1.4.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/colors"},{"name":"figlet","version":"1.2.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/figlet"},{"name":"js-yaml","version":"3.13.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/js-yaml"},{"name":"argparse","version":"1.0.10","group":"","requestedBy":{},"pathOnDisk":"/node_modules/argparse"},{"name":"sprintf-js","version":"1.0.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/sprintf-js"},{"name":"esprima","version":"4.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/esprima"},{"name":"log4js","version":"6.1.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/log4js"},{"name":"date-format","version":"3.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/date-format"},{"name":"debug","version":"4.1.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/log4js/node_modules/debug"},{"name":"ms","version":"2.1.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ms"},{"name":"flatted","version":"2.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/flatted"},{"name":"rfdc","version":"1.1.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/rfdc"},{"name":"streamroller","version":"2.2.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/streamroller"},{"name":"date-format","version":"2.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/streamroller/node_modules/date-format"},{"name":"fs-extra","version":"8.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/fs-extra"},{"name":"graceful-fs","version":"4.2.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/graceful-fs"},{"name":"jsonfile","version":"4.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/jsonfile"},{"name":"universalify","version":"0.1.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/universalify"},{"name":"node-fetch","version":"2.6.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/node-fetch"},{"name":"node-persist","version":"3.0.5","group":"","requestedBy":{},"pathOnDisk":"/node_modules/node-persist"},{"name":"mkdirp","version":"0.5.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/mkdirp"},{"name":"minimist","version":"0.0.8","group":"","requestedBy":{},"pathOnDisk":"/node_modules/minimist"},{"name":"ora","version":"4.0.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora"},{"name":"cli-cursor","version":"3.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/cli-cursor"},{"name":"restore-cursor","version":"3.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/restore-cursor"},{"name":"onetime","version":"5.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/onetime"},{"name":"mimic-fn","version":"2.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/mimic-fn"},{"name":"signal-exit","version":"3.0.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/signal-exit"},{"name":"cli-spinners","version":"2.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/cli-spinners"},{"name":"is-interactive","version":"1.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/is-interactive"},{"name":"log-symbols","version":"3.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora/node_modules/log-symbols"},{"name":"chalk","version":"2.4.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora/node_modules/log-symbols/node_modules/chalk"},{"name":"ansi-styles","version":"3.2.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora/node_modules/ansi-styles"},{"name":"color-convert","version":"1.9.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora/node_modules/color-convert"},{"name":"color-name","version":"1.1.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora/node_modules/color-name"},{"name":"escape-string-regexp","version":"1.0.5","group":"","requestedBy":{},"pathOnDisk":"/node_modules/escape-string-regexp"},{"name":"supports-color","version":"5.5.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ora/node_modules/supports-color"},{"name":"has-flag","version":"3.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/has-flag"},{"name":"mute-stream","version":"0.0.8","group":"","requestedBy":{},"pathOnDisk":"/node_modules/mute-stream"},{"name":"strip-ansi","version":"6.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/strip-ansi"},{"name":"ansi-regex","version":"5.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ansi-regex"},{"name":"wcwidth","version":"1.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/wcwidth"},{"name":"defaults","version":"1.0.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/defaults"},{"name":"clone","version":"1.0.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/clone"},{"name":"read-installed","version":"4.0.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/read-installed"},{"name":"debuglog","version":"1.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/debuglog"},{"name":"read-package-json","version":"2.1.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/read-package-json"},{"name":"glob","version":"7.1.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/glob"},{"name":"fs.realpath","version":"1.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/fs.realpath"},{"name":"inflight","version":"1.0.6","group":"","requestedBy":{},"pathOnDisk":"/node_modules/inflight"},{"name":"once","version":"1.4.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/once"},{"name":"wrappy","version":"1.0.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/wrappy"},{"name":"inherits","version":"2.0.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/inherits"},{"name":"minimatch","version":"3.0.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/minimatch"},{"name":"brace-expansion","version":"1.1.11","group":"","requestedBy":{},"pathOnDisk":"/node_modules/brace-expansion"},{"name":"balanced-match","version":"1.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/balanced-match"},{"name":"concat-map","version":"0.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/concat-map"},{"name":"path-is-absolute","version":"1.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/path-is-absolute"},{"name":"json-parse-better-errors","version":"1.0.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/json-parse-better-errors"},{"name":"normalize-package-data","version":"2.5.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/normalize-package-data"},{"name":"hosted-git-info","version":"2.8.5","group":"","requestedBy":{},"pathOnDisk":"/node_modules/hosted-git-info"},{"name":"resolve","version":"1.14.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/resolve"},{"name":"path-parse","version":"1.0.6","group":"","requestedBy":{},"pathOnDisk":"/node_modules/path-parse"},{"name":"semver","version":"5.7.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/semver"},{"name":"validate-npm-package-license","version":"3.0.4","group":"","requestedBy":{},"pathOnDisk":"/node_modules/validate-npm-package-license"},{"name":"spdx-correct","version":"3.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/spdx-correct"},{"name":"spdx-expression-parse","version":"3.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/spdx-expression-parse"},{"name":"spdx-exceptions","version":"2.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/spdx-exceptions"},{"name":"spdx-license-ids","version":"3.0.5","group":"","requestedBy":{},"pathOnDisk":"/node_modules/spdx-license-ids"},{"name":"npm-normalize-package-bin","version":"1.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/npm-normalize-package-bin"},{"name":"readdir-scoped-modules","version":"1.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/readdir-scoped-modules"},{"name":"dezalgo","version":"1.0.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/dezalgo"},{"name":"asap","version":"2.0.6","group":"","requestedBy":{},"pathOnDisk":"/node_modules/asap"},{"name":"slide","version":"1.1.6","group":"","requestedBy":{},"pathOnDisk":"/node_modules/slide"},{"name":"util-extend","version":"1.0.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/util-extend"},{"name":"ssri","version":"6.0.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/ssri"},{"name":"figgy-pudding","version":"3.5.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/figgy-pudding"},{"name":"uuid","version":"3.3.3","group":"","requestedBy":{},"pathOnDisk":"/node_modules/uuid"},{"name":"xmlbuilder","version":"13.0.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/xmlbuilder"},{"name":"xmldom","version":"0.2.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/xmldom"},{"name":"yargs","version":"15.0.2","group":"","requestedBy":{},"pathOnDisk":"/node_modules/yargs"},{"name":"cliui","version":"6.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/cliui"},{"name":"string-width","version":"4.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/string-width"},{"name":"emoji-regex","version":"8.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/emoji-regex"},{"name":"is-fullwidth-code-point","version":"3.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/is-fullwidth-code-point"},{"name":"wrap-ansi","version":"6.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/wrap-ansi"},{"name":"decamelize","version":"1.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/decamelize"},{"name":"find-up","version":"4.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/find-up"},{"name":"locate-path","version":"5.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/locate-path"},{"name":"p-locate","version":"4.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/p-locate"},{"name":"p-limit","version":"2.2.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/p-limit"},{"name":"p-try","version":"2.2.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/p-try"},{"name":"path-exists","version":"4.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/path-exists"},{"name":"get-caller-file","version":"2.0.5","group":"","requestedBy":{},"pathOnDisk":"/node_modules/get-caller-file"},{"name":"require-directory","version":"2.1.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/require-directory"},{"name":"require-main-filename","version":"2.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/require-main-filename"},{"name":"set-blocking","version":"2.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/set-blocking"},{"name":"which-module","version":"2.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/which-module"},{"name":"y18n","version":"4.0.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/y18n"},{"name":"yargs-parser","version":"16.1.0","group":"","requestedBy":{},"pathOnDisk":"/node_modules/yargs-parser"},{"name":"camelcase","version":"5.3.1","group":"","requestedBy":{},"pathOnDisk":"/node_modules/camelcase"}]';

describe('NpmList SanityCheck', async () => {
  it('compare prior result to refactored result', async () => {
    const npmList = new NpmList();

    const coordinates: Array<Coordinates> = await npmList.getInstalledDeps();
    const coordinatesJson = JSON.stringify(coordinates);
    expect(coordinatesJson).to.eq(expectedCoordinatesJson);
  });
});

describe('NpmList.maybePushNewCoordinate', async () => {
  it('handle path with leading / found in coordinate list', async () => {
    const npmList = new NpmList();

    const data = {
      name: '@types/color-name',
      version: '1.1.1',
      _requiredBy: ['/ansi-styles'],
    };

    const setRequestedBy = new Set<string>();
    setRequestedBy.add('/ansi-styles');
    const actualCoordinates: Array<Coordinates> = [
      new Coordinates('color-name', data.version, '@types', setRequestedBy, '/node_modules/@types/color-name'),
    ];

    const result = npmList['maybePushNewCoordinate'](data, actualCoordinates);
    // should not have pushed any new items
    expect(result).to.eq(false);
    expect(actualCoordinates[0].name).to.eq('color-name');

    actualCoordinates[0].requestedBy.forEach(function(value) {
      expect(value).to.eq('/ansi-styles');
    });
    expect(actualCoordinates[0].requestedBy.size).to.eq(1);

    expect(actualCoordinates.length).to.eq(1);
  });

  it('handle path with leading / Not found in coordinate list', async () => {
    const npmList = new NpmList();

    const data = {
      name: '@types/color-name',
      version: '1.1.1',
      _requiredBy: ['/ansi-styles'],
      realPath: cwd + '/node_modules/color-name',
    };

    const actualCoordinates: Array<Coordinates> = [];

    const result = npmList['maybePushNewCoordinate'](data, actualCoordinates);
    // should push new item
    expect(result).to.eq(true);
    expect(actualCoordinates[0].name).to.eq('color-name');
    expect(actualCoordinates[0].pathOnDisk).to.eq('/node_modules/color-name');

    expect(actualCoordinates[0].requestedBy.has('/ansi-styles')).to.be.true;
    expect(actualCoordinates[0].requestedBy.size).to.eq(1);

    expect(actualCoordinates.length).to.eq(1);
  });

  it('handle normal package name found in coordinate list', async () => {
    const npmList = new NpmList();

    const data = {
      name: 'has-flag',
      version: '1.1.1',
      _requiredBy: ['/color-name'],
      realPath: cwd + '/node_modules/chalk/node_modules/has-flag',
    };

    const setRequestedBy = new Set<string>();
    const actualCoordinates: Array<Coordinates> = [
      new Coordinates(data.name, data.version, '', setRequestedBy, '/node_modules/chalk/node_modules/has-flag'),
    ];

    const result = npmList['maybePushNewCoordinate'](data, actualCoordinates);
    // should not push new item
    expect(result).to.eq(false);
    expect(actualCoordinates[0].name).to.eq(data.name);
    expect(actualCoordinates[0].pathOnDisk).to.eq('/node_modules/chalk/node_modules/has-flag');

    expect(actualCoordinates[0].requestedBy.has(data._requiredBy[0])).to.be.true;
    expect(actualCoordinates[0].requestedBy.size).to.eq(1);

    expect(actualCoordinates.length).to.eq(1);
  });

  it('normal package name / Not found in coordinate list', async () => {
    const npmList = new NpmList();

    const data = {
      name: 'has-flag',
      version: '1.1.1',
      _requiredBy: ['/color-name'],
      realPath: cwd + '/node_modules/has-flag',
    };

    const actualCoordinates: Array<Coordinates> = [];

    const result = npmList['maybePushNewCoordinate'](data, actualCoordinates);
    // should push new item
    expect(result).to.eq(true);
    expect(actualCoordinates[0].name).to.eq(data.name);
    expect(actualCoordinates[0].pathOnDisk).to.eq('/node_modules/has-flag');

    expect(actualCoordinates[0].requestedBy.has(data._requiredBy[0])).to.be.true;
    expect(actualCoordinates[0].requestedBy.size).to.eq(1);

    expect(actualCoordinates.length).to.eq(1);
  });

  it('empty package name', async () => {
    const npmList = new NpmList();

    const data = {
      name: '',
    };

    const actualCoordinates: Array<Coordinates> = [];

    const result = npmList['maybePushNewCoordinate'](data, actualCoordinates);
    // should not push new item
    expect(result).to.eq(false);

    expect(actualCoordinates.length).to.eq(0);
  });
});
