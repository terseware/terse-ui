import {type ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideTerseUi} from '@terse-ui/core';
import {Home} from './home';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideTerseUi(),
    provideRouter([
      {
        path: '**',
        component: Home,
      },
    ]),
  ],
};
