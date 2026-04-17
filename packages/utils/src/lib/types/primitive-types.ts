import type {ElementRef, Injector, Signal} from '@angular/core';

/**
 * A function of arity `A` returning `T`.
 */
export type Fn<T = unknown, A extends unknown[] = never[]> = (...args: A) => T;

/** `T | PromiseLike<T>` — useful for APIs that accept sync or async values. */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * Either a direct value or a function that produces one.
 */
export type MaybeFn<T = unknown, A extends unknown[] = never[]> = T | Fn<T, A>;

/**
 * Stricter {@link MaybeFn} that forbids `T` from being a function type.
 * Produces a type error at declaration rather than ambiguity at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type MaybeFnStrict<T, A extends unknown[] = never[]> = T extends Function
  ? never
  : T | Fn<T, A>;

/** `T | null | undefined`. */
export type Nullish<T> = T | null | undefined;

// https://github.com/microsoft/TypeScript/issues/29729
export type Union<T, U> = T | (U & {});

/**
 * Removes `null | undefined` from `T`.
 */
export type NonNullish<T> = T extends null | undefined ? never : T;

/** A nullable {@link MaybeFn}. */
export type MaybeFnNullish<T, A extends unknown[] = never[]> = MaybeFn<Nullish<T>, A>;

/** Either a direct value or a signal that produces one. */
export type MaybeSignal<T> = T | Signal<T>;

/** Either a direct value, an `ElementRef`, or a signal that produces one. */
export type MaybeElementSignal<T extends Element> =
  | T
  | ElementRef<T>
  | Signal<T | ElementRef<T> | null | undefined>;

export type SignalValue<S> = S extends Signal<infer V> ? V : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySignal = Signal<any>;

export type SignalValues<T extends readonly AnySignal[]> = {
  readonly [K in keyof T]: SignalValue<T[K]>;
};

/** Either a direct value or a zero-arg function producing one. */
export type MaybeComputation<T> = T | (() => T);

/** Provides optional injector property. */
export interface WithInjector {
  readonly injector?: Injector;
}

/** Any concrete class constructor. */
export type Constructor<T extends object = object, A extends unknown[] = never[]> = A extends []
  ? new () => T
  : new (...args: A) => T;

/** Any abstract class constructor. */
export type AbstractConstructor<
  T extends object = object,
  A extends unknown[] = never[],
> = A extends [] ? abstract new () => T : abstract new (...args: A) => T;

/** Either a concrete or abstract class constructor. */
export type AnyConstructor<T extends object = object, A extends unknown[] = never[]> =
  | Constructor<T, A>
  | AbstractConstructor<T, A>;
