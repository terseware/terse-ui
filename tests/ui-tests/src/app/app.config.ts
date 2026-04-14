import {type ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';
import {TestMenuDisableFixture} from './fixtures/menu/menu-disable-fixture';
import {TestMenuNestedFixture} from './fixtures/menu/menu-nested-fixture';
import {TestMenuSimpleFixture} from './fixtures/menu/menu-simple-fixture';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter([
      {
        path: 'menu',
        component: TestMenuSimpleFixture,
      },
      {
        path: 'menu-disable',
        component: TestMenuDisableFixture,
      },
      {
        path: 'menu-nested',
        component: TestMenuNestedFixture,
      },
    ]),
  ],
};
