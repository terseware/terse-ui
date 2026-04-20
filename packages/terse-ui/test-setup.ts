import '@angular/compiler';

import '@analogjs/vitest-angular/setup-snapshots';

import '@analogjs/vitest-angular/setup-serializers';

import {setupTestBed} from '@analogjs/vitest-angular/setup-testbed';

import '@testing-library/jest-dom/vitest';

import {provideHostEvents} from './src/lib/events/host-events';

setupTestBed({providers: [provideHostEvents()]});
