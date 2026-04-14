import {
  computed,
  isSignal,
  linkedSignal,
  signal,
  type CreateComputedOptions,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  toDeepSignal,
  unwrapMerge,
  type DeepPartial,
  type DeepReadonly,
  type DeepSignal,
  type MaybeProp,
  type WithRequired,
} from '@terse-ui/core/utils';

/**
 * Configuration for {@link State}.
 *
 * @typeParam T - Internal state shape.
 * @typeParam R - Public state shape (defaults to `T`).
 */
export interface StateOptions<S, R = S> extends CreateComputedOptions<R> {
  /**
   * Derive a public shape `R` from the internal state `T`.
   *
   * Required when `T` and `R` differ. Runs inside a `computed`,
   * so any signals read here become automatic dependencies.
   */
  transform?: (value: S) => R;
}

/**
 * Reactive state container backed by an Angular signal.
 *
 * Wraps a writable signal with a read-only, deep-signal projection
 * exposed via {@link state}. Accepts a static value or an existing
 * signal as input — when a signal is provided, changes are tracked
 * via `linkedSignal`.
 *
 * Subclass this to build stateful directives. Override
 * {@link resolveState} to intercept the value before it reaches
 * the public projection (see {@link StatePipeline}).
 *
 * @typeParam T - Internal state shape.
 * @typeParam R - Public state shape (defaults to `T`).
 *
 * @example
 * ```ts
 * class Focus extends State<FocusState> {
 *   constructor() {
 *     super({focused: false, focusVisible: false});
 *   }
 * }
 *
 * // With a transform
 * class Hover extends State<HoverInner, HoverPublic> {
 *   constructor() {
 *     super({hovered: false}, {
 *       transform: (s) => ({...s, isActive: s.hovered}),
 *     });
 *   }
 * }
 * ```
 */
export class State<S, R = S> {
  /** The mutable inner signal. */
  protected readonly innerState: WritableSignal<S>;

  /** Read-only deep-signal projection of the resolved, transformed state. */
  readonly state: DeepSignal<DeepReadonly<R>>;

  constructor(
    ...args: [S] extends [R]
      ? [R] extends [S]
        ? [input: Signal<S> | S, options?: StateOptions<S, R>]
        : [input: Signal<S> | S, options: WithRequired<StateOptions<S, R>, 'transform'>]
      : [input: Signal<S> | S, options: WithRequired<StateOptions<S, R>, 'transform'>]
  ) {
    const input = args[0];
    const options = args[1];
    const transform = options?.transform ?? ((value: S) => value as unknown as R);
    this.innerState = isSignal(input) ? linkedSignal(input) : signal(input);
    this.state = toDeepSignal(
      computed(() => transform(this.resolveState()), options) as Signal<DeepReadonly<R>>,
    );
  }

  /**
   * Produce the value fed into the `transform` pipeline.
   *
   * Default: returns a shallow-frozen snapshot of {@link innerState}.
   * Override in subclasses to intercept or transform the raw state
   * before it reaches the public projection.
   */
  protected resolveState(): S {
    return Object.freeze(this.innerState());
  }

  /**
   * Deep-merge a partial update into the inner state.
   *
   * Accepts a static partial or a lazy factory function.
   * Use {@link updateState} when you need access to the current
   * value or when deep-merge semantics aren't sufficient (e.g. removing keys).
   */
  protected patchState(state: MaybeProp<DeepPartial<S>, [S]>): void {
    this.innerState.update((s) => unwrapMerge(s, state));
  }

  /**
   * Replace the inner state via an updater function.
   *
   * Unlike {@link patchState}, this gives full control over the
   * next state value — useful for entity operations, key removal,
   * or any transformation that deep-merge can't express.
   */
  protected updateState(updater: (state: S) => S): void {
    this.innerState.update(updater);
  }
}
