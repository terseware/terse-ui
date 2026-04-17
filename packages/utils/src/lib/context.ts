import {
  assertInInjectionContext,
  DestroyRef,
  inject,
  INJECTOR,
  isDevMode,
  untracked,
  type Injector,
} from '@angular/core';
import {IS_BROWSER, IS_MOBILE, IS_SERVER} from './platform';
import type {Fn} from './types/primitive-types';

/**
 * Context object passed to {@link withContext} / {@link setupContext} callbacks.
 *
 * @remarks
 * Platform flags are lazy getters — the underlying tokens are only injected
 * on first access. If your callback never reads `isMobile`, the DI lookup
 * never happens.
 *
 * `onCleanup` returns an unsubscribe function that cancels the cleanup
 * registration without running it. Useful when resources are disposed
 * manually and the destroy-time callback would double-dispose.
 */
export interface ContextRef {
  readonly injector: Injector;
  readonly isBrowser: boolean;
  readonly isServer: boolean;
  readonly isMobile: boolean;
  readonly onCleanup: (cleanupFn: () => void) => () => void;
}

/** Handle returned by {@link setupContext} for deferred / repeated execution. */
export interface SetupContextRef {
  readonly runInContext: <T>(fn: (context: ContextRef) => T) => T;
}

/**
 * One-shot context runner — the common case. Must be called in an injection
 * context unless an explicit `injector` is passed in.
 */
export function withContext<T>(
  injector: Injector | undefined,
  fn: (context: ContextRef) => T,
  debugFn?: Fn | undefined,
): T {
  if (isDevMode() && !injector) {
    assertInInjectionContext(debugFn ?? withContext);
  }
  const resolvedInjector = injector ?? inject(INJECTOR);
  return runWithContext(fn, resolvedInjector);
}

/**
 * Deferred / repeatable variant. Captures the injector now, runs callbacks
 * later. Use when the injection context won't be available at call time
 * (e.g. inside an async boundary or a stored callback).
 */
export function setupContext(
  injector?: Injector | undefined,
  debugFn?: Fn | undefined,
): SetupContextRef {
  if (isDevMode() && !injector) {
    assertInInjectionContext(debugFn ?? setupContext);
  }
  const captured = injector ?? inject(INJECTOR);
  return {
    runInContext: (fn) => runWithContext(fn, captured),
  };
}

function runWithContext<T>(fn: (context: ContextRef) => T, injector: Injector): T {
  // `untracked` guards against signal tracking leaking out of the callback
  // when `runWithContext` is itself called from a reactive consumer (effect,
  // computed). No-op in non-reactive contexts.
  return untracked(() => fn(buildContextRef(injector)));
}

function buildContextRef(injector: Injector): ContextRef {
  // Platform-flag fields are lazy — inject only on first read. Callers that
  // only need `injector` pay zero DI cost for the rest.
  const destroyRef = injector.get(DestroyRef);
  let isBrowser: boolean;
  let isServer: boolean;
  let isMobile: boolean;

  return {
    injector,
    get isBrowser() {
      return (isBrowser ??= injector.get(IS_BROWSER));
    },
    get isServer() {
      return (isServer ??= injector.get(IS_SERVER));
    },
    get isMobile() {
      return (isMobile ??= injector.get(IS_MOBILE));
    },
    onCleanup: (cleanupFn) => destroyRef.onDestroy(cleanupFn),
  };
}
