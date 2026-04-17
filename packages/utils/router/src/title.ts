import {type CreateSignalOptions, inject, linkedSignal, type WritableSignal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Title} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {proxySignal, setupContext} from '@signality/core/internal';
import type {WithInjector} from '@signality/core/types';
import {filter} from 'rxjs';

export type TitleOptions = CreateSignalOptions<string> & WithInjector;

/**
 * Reactive wrapper around the [Angular Router](https://angular.dev/guide/routing) route title.
 *
 * @param options - Optional configuration
 * @returns A writable signal containing the current route title (string)
 *
 * @example
 * ```typescript
 * @Component({
 *   template: `
 *     <div>
 *       <h1>{{ pageTitle() }}</h1>
 *       <button (click)="updateTitle()">Update Title</button>
 *     </div>
 *   `
 * })
 * export class Page {
 *   readonly pageTitle = title();
 *
 *   updateTitle() {
 *     this.pageTitle.set('New Page Title');
 *   }
 * }
 * ```
 */
export function title(options?: TitleOptions): WritableSignal<string> {
  const {runInContext} = setupContext(options?.injector, title);

  return runInContext(() => {
    const route = inject(ActivatedRoute);
    const html = inject(Title);

    return proxySignal(
      linkedSignal(
        toSignal<string, string>(route.title.pipe(filter(Boolean)), {
          initialValue: route.snapshot.title || html.getTitle(),
        }),
        {...options},
      ),
      {
        set: (value, source) => {
          html.setTitle(value);
          source.set(value);
        },
      },
    );
  });
}
