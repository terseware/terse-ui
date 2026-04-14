import {
  computed,
  DestroyRef,
  inject,
  Injector,
  runInInjectionContext,
  signal,
  untracked,
  type CreateEffectOptions,
  type InjectOptions,
  type Signal,
  type Type,
  type WritableSignal,
} from '@angular/core';
import {isFunction, isUndefined, type Fn} from '@terseware/ui/internal';
import {applySignalClass} from '../internal/apply-class-signal';

export interface State<T, R = T> extends Signal<R> {
  (): R;
}

export type LinkStateOpts = CreateEffectOptions & {track?: boolean};

export interface PipeOpts {
  /** DestroyRef to register cleanup on. Defaults to ambient `inject(DestroyRef)`. */
  destroyRef?: DestroyRef;
  /**
   * Injector captured at registration time. Contribution bodies run inside
   * `runInInjectionContext(injector, ...)` so they may call `inject(...)`
   * at evaluation time. Defaults to ambient `inject(Injector)` unless
   * `manualCleanup: true`, in which case no context is captured.
   */
  injector?: Injector;
  /** Insert at the front of the contribution list instead of the end. */
  prepend?: boolean;
  /**
   * Skip auto-cleanup on DestroyRef destroy. The returned function
   * remains the only way to remove this contribution.
   */
  manualCleanup?: boolean;
}

/**
 * Writable reactive state with a callable signal surface. Instances ARE the
 * readonly signal — calling them returns the current value. Mutation is
 * `protected`; subclasses expose `set` / `update` / etc. as they wish.
 *
 * ### Contribution model
 *
 * External directives contribute to a state's final value through three
 * ordered tiers. Each tier is its own ordered list; evaluation walks all
 * three in sequence inside the backing `computed`, so contributions are
 * fully reactive — any signal read inside a contribution function becomes
 * a dependency of the state's readonly surface.
 *
 * 1. **`fallback(fn)`** runs first. Use to set a default value that other
 *    contributors can overwrite. Multiple fallbacks register in insertion
 *    order (or at the front with `prepend: true`).
 *
 * 2. **`pipe(fn)`** runs in the middle. Use for genuine transforms that
 *    read the current value and conditionally modify it — the classic
 *    case is `Disabler`'s transform on `TabIndex` that forces `-1` when
 *    hard-disabled but passes through otherwise.
 *
 * 3. **`override(fn)`** runs last. Use when the registering directive is
 *    claiming the final value. Multiple overrides register in insertion
 *    order — the **most recently registered wins** — and combined with
 *    the natural host-directive construction order (outer wrapper
 *    constructs after inner primitive) this means an outer compositing
 *    directive always beats its inner contributions without any
 *    numeric-priority book-keeping.
 *
 * ### Example
 *
 * ```ts
 * // Button sets a base role for non-natives, reversible by wrappers.
 * inject(Role).fallback((role) => role ?? (isBtnRole ? null : 'button'));
 *
 * // MenuItem unconditionally claims role=menuitem.
 * inject(Role).override(() => 'menuitem');
 * ```
 *
 * Reading either file in isolation makes the intent obvious, and the
 * final value is independent of host-directive construction order:
 * fallbacks land in the fallback list, overrides land in the override
 * list, and the computed evaluates them in tier order on every read.
 *
 * ### Injection-context wrapping
 *
 * Contribution functions are automatically wrapped in
 * `runInInjectionContext(injector, ...)` using the injector captured at
 * registration time, so bodies may call `inject(...)` at evaluation time
 * without having to capture dependencies via closure during registration.
 * Pass `{injector}` explicitly when registering from a non-injection
 * context, or `{manualCleanup: true}` to skip both the context wrap and
 * the `DestroyRef` auto-registration (useful for contributions added
 * from inside an `effect` whose lifetime is managed by the effect's
 * own `onCleanup`).
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class State<T, R = T> extends Function {
  declare private readonly _source: Signal<R>;
  declare private readonly _state: WritableSignal<T>;
  declare protected readonly result: (s: T) => R;
  declare private readonly _fallbacks: WritableSignal<((i: T) => T)[]>;
  declare private readonly _pipes: WritableSignal<((i: T) => T)[]>;
  declare private readonly _overrides: WritableSignal<((i: T) => T)[]>;

  constructor(
    ...args: [T] extends [R]
      ? [R] extends [T]
        ? [state: WritableSignal<T>, convert?: (s: NoInfer<T>) => R]
        : [state: WritableSignal<T>, convert: (s: NoInfer<T>) => R]
      : [state: WritableSignal<T>, convert: (s: NoInfer<T>) => R]
  ) {
    super();
    const state = args[0];
    const convert = args[1] ?? ((e: T) => e);
    const fallbacks = signal([] as ((i: T) => T)[]);
    const pipes = signal([] as ((i: T) => T)[]);
    const overrides = signal([] as ((i: T) => T)[]);

    const source = computed(() => {
      let s = state();
      for (const fn of fallbacks()) s = fn(s);
      for (const fn of pipes()) s = fn(s);
      for (const fn of overrides()) s = fn(s);
      return convert(s);
    });

    applySignalClass(source, new.target.prototype, '_source');
    Object.defineProperty(source, '_state', {value: state});
    Object.defineProperty(source, '_fallbacks', {value: fallbacks});
    Object.defineProperty(source, '_pipes', {value: pipes});
    Object.defineProperty(source, '_overrides', {value: overrides});
    Object.defineProperty(source, 'convert', {value: convert});

    return source as unknown as Signal<T> & this;
  }

  /** Read the current value; pass `false` to read untracked. */
  value(tracked = true): R {
    return tracked ? this._source() : untracked(() => this._source());
  }

  /** The readonly signal view. */
  asReadonly(): Signal<R> {
    return this._source;
  }

  /** Apply `selector` to the current value without creating a computed. */
  snapshot<U>(selector: Fn<U, [R]>, tracked = true): U {
    return selector(this.value(tracked));
  }

  /** Derive a computed signal via `selector`. */
  select<U>(selector: Fn<U, [R]>): Signal<U> {
    return computed(() => selector(this._source()));
  }

  /**
   * Contribute a **fallback** transformation. Fallbacks run before any
   * `pipe` or `override` contributions — use to set a default value that
   * later contributors can overwrite.
   */
  fallback(fn: (s: T) => T, opts?: PipeOpts): () => void {
    return registerContribution(this._fallbacks, fn, opts);
  }

  /**
   * Contribute a **transform** that reads the current value. Pipes run
   * after fallbacks and before overrides. Use for reactive derivations
   * that conditionally modify whatever is already there.
   */
  pipe(fn: (s: T) => T, opts?: PipeOpts): () => void {
    return registerContribution(this._pipes, fn, opts);
  }

  /**
   * Contribute an **override** that claims the final value. Overrides
   * run last and the most-recently-registered wins, so an outer
   * compositing directive always beats its inner contributions via the
   * natural host-directive construction order.
   */
  override(fn: (s: T) => T, opts?: PipeOpts): () => void {
    return registerContribution(this._overrides, fn, opts);
  }

  protected set(value: T): void {
    if (!isUndefined(value)) {
      this._state.set(value);
    }
  }

  protected update(updateFn: (value: T) => T) {
    this._state.update(updateFn);
  }

  /** Shallow-merge a partial (or a function returning one) into object state. */
  protected patch(patch: Partial<T>): void;
  protected patch(fn: Fn<T, [Partial<T>]>): void;
  protected patch(fn: Partial<T> | Fn<T, [Partial<T>]>): void {
    this._state.update((e) => ({...e, ...(isFunction(fn) ? fn(e) : fn)}));
  }

  protected stateValue(tracked = true): T {
    return tracked ? this._state() : untracked(() => this._state());
  }
}

/**
 * Shared registration logic for `fallback` / `pipe` / `override`. Adds
 * the handler to the given list (at the end, or at the front if
 * `prepend: true`), wires DestroyRef auto-cleanup unless opted out,
 * and — when an injector is available — wraps the handler in
 * `runInInjectionContext` so the body can call `inject(...)` at
 * evaluation time.
 */
function registerContribution<T>(
  list: WritableSignal<((i: T) => T)[]>,
  fn: (s: T) => T,
  opts?: PipeOpts,
): () => void {
  const manualCleanup = opts?.manualCleanup ?? false;
  const injector = opts?.injector ?? (manualCleanup ? null : inject(Injector));
  const wrapped: (s: T) => T = injector ? (s) => runInInjectionContext(injector, () => fn(s)) : fn;

  list.update(opts?.prepend ? (p) => [wrapped, ...p] : (p) => [...p, wrapped]);
  const rm = (): void => {
    list.update((p) => p.filter((x) => x !== wrapped));
  };

  if (!manualCleanup) {
    (opts?.destroyRef ?? inject(DestroyRef)).onDestroy(rm);
  }

  return rm;
}

interface Contributable<T> {
  fallback(fn: (i: T) => T, opts?: PipeOpts): () => void;
  pipe(fn: (i: T) => T, opts?: PipeOpts): () => void;
  override(fn: (i: T) => T, opts?: PipeOpts): () => void;
}

type ExtractS<T> = T extends Contributable<infer S> ? S : never;

/**
 * Inject an atom and register a **fallback** contribution in one call.
 * See {@link State.fallback} for the contribution semantic.
 */
export function fallback<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options: PipeOpts & InjectOptions & {optional: true},
): T | null;
export function fallback<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options?: PipeOpts & InjectOptions & {optional?: false},
): T;
export function fallback<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options?: PipeOpts & InjectOptions,
) {
  const instance = inject(type, options ?? {});
  instance?.fallback(fn, options);
  return instance;
}

/**
 * Inject an atom and register a **transform** contribution in one call.
 * See {@link State.pipe} for the contribution semantic.
 */
export function pipe<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options: PipeOpts & InjectOptions & {optional: true},
): T | null;
export function pipe<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options?: PipeOpts & InjectOptions & {optional?: false},
): T;
export function pipe<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options?: PipeOpts & InjectOptions,
) {
  const instance = inject(type, options ?? {});
  instance?.pipe(fn, options);
  return instance;
}

/**
 * Inject an atom and register an **override** contribution in one call.
 * See {@link State.override} for the contribution semantic.
 */
export function override<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options: PipeOpts & InjectOptions & {optional: true},
): T | null;
export function override<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options?: PipeOpts & InjectOptions & {optional?: false},
): T;
export function override<T extends Contributable<ExtractS<T>>>(
  type: Type<T>,
  fn: (i: ExtractS<T>) => ExtractS<T>,
  options?: PipeOpts & InjectOptions,
) {
  const instance = inject(type, options ?? {});
  instance?.override(fn, options);
  return instance;
}

export function readOnly<S, R>(
  type: Type<State<S, R>>,
  options: InjectOptions & {optional: true},
): Signal<R> | null;
export function readOnly<S, R>(
  type: Type<State<S, R>>,
  options?: InjectOptions & {optional?: false},
): Signal<R>;
export function readOnly<S, R>(type: Type<State<S, R>>, options?: InjectOptions) {
  return inject(type, options ?? {})?.asReadonly() ?? null;
}
