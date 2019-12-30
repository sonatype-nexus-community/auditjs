import path from 'path';
import {homedir} from 'os';

export abstract class Config {
  constructor(readonly username: string, readonly token: string) {}
  
  getSaveLocation(configName: string = '.oss-index-config'): string {
    return path.join(homedir(), configName);
  }
  abstract saveConfigToFile(saveLocation?: string): boolean;
  abstract getConfigFromFile(saveLocation?: string): Config;
}
