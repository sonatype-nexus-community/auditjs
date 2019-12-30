import path from 'path';
import {homedir} from 'os';

export abstract class Config {
  constructor() {
  }
  
  getSaveLocation(configName: string = '.oss-index-config'): string {
    return path.join(homedir(), configName);
  }
  abstract saveConfigToFile(saveLocation?: string): boolean;
  abstract getConfigFromFile(saveLocation?: string): Config;
  abstract getUsername(): string;
  abstract getToken(): string;
}
