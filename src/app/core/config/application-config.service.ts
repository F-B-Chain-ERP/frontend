import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApplicationConfigService {
  private endpointPrefix = '';
  private microfrontend = false;

  setEndpointPrefix(endpointPrefix: string): void {
    this.endpointPrefix = endpointPrefix;
  }

  setMicrofrontend(microfrontend = true): void {
    this.microfrontend = microfrontend;
  }

  isMicrofrontend(): boolean {
    return this.microfrontend;
  }

  getEndpointFor(api: string, microservice?: string): string {
    if (!api) {
      return this.endpointPrefix || '';
    }
    if (microservice) {
      const prefix = this.endpointPrefix ? (this.endpointPrefix.endsWith('/') ? this.endpointPrefix : `${this.endpointPrefix}/`) : '';
      const cleanApi = api.replace(/^\//, '');
      return `${prefix}services/${microservice}/${cleanApi}`;
    }
    if (!this.endpointPrefix) {
      return api.startsWith('/') ? api : `/${api}`;
    }
    const cleanPrefix = this.endpointPrefix.endsWith('/') ? this.endpointPrefix.slice(0, -1) : this.endpointPrefix;
    const cleanApi = api.startsWith('/') ? api : `/${api}`;
    return `${cleanPrefix}${cleanApi}`;
  }
}
