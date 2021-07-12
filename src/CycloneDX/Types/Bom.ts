import {Metadata} from './Metadata';
import {Component} from './Component';
import {Dependency} from './Dependency';

export interface Bom {
  '@serial-number': string,
  '@version': number,
  '@xmlns': string,
  'metadata': Metadata,
  'components': Array<Component>,
  'dependencies': Array<Dependency>
}
