
export interface Dependency {
  '@ref': string;
  dependencies?: Array<Dependency>
}
