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

import { DepGraph } from 'dependency-graph';
import { Component } from '../CycloneDX/Types/Component';
import { Coordinates } from '../Types/Coordinates';
import { PackageURL } from 'packageurl-js';

export interface Muncher {
  getDepList(): Promise<Array<Coordinates>>;
  getGraph(): DepGraph<Component> | undefined;
  getSbomFromCommand(): Promise<any>;
  getInstalledDeps(): Promise<any>;
  getInstalledDepsAsPurls(): Promise<Array<PackageURL>>
  isValid(): boolean;
}
