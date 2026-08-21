import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerLocaleData } from '@angular/common';
import vi from '@angular/common/locales/vi';

registerLocaleData(vi);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

