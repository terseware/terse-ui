import {type CreateSignalOptions, inject, type WritableSignal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Title} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {setupContext, type WithInjector} from '@terse-ui/utils';
import {delegatedSignal} from '@terse-ui/utils/signals';
import {filter} from 'rxjs';

export type TitleOptions = CreateSignalOptions<string> & WithInjector;

/**
 * Reactive wrapper around the [Angular Router](https://angular.dev/guide/routing) route title.
 */
export function title(options?: TitleOptions): WritableSignal<string> {
  const {runInContext} = setupContext(options?.injector, title);
  return runInContext(() => {
    const t = inject(Title);
    const route = inject(ActivatedRoute);
    return delegatedSignal({
      read: toSignal(route.title.pipe(filter(Boolean)), {
        ...options,
        initialValue: route.snapshot.title || t.getTitle(),
      }),
      write: (v) => void t.setTitle(v),
      ...options,
    });
  });
}
