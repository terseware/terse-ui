import type {Provider} from '@angular/core';
import {provideHostEvents} from './events/host-events';

export function provideTerseUi(): Provider[] {
  return [provideHostEvents()];
}
