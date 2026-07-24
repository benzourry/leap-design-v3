/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import localeMs from '@angular/common/locales/ms';
import { registerLocaleData } from '@angular/common';

// 1. Register the locale data globally (can be right outside the class or inside constructor)
registerLocaleData(localeMs, 'ms-MY');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
