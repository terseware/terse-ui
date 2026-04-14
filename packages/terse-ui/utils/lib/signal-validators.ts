import type {
  InputSignal,
  InputSignalWithTransform,
  ModelSignal,
  Signal,
  WritableSignal,
} from '@angular/core';
import {isSignal} from '@angular/core';
import type {SignalNode} from '@angular/core/primitives/signals';
import {producerAccessed, SIGNAL} from '@angular/core/primitives/signals';
import {isFunction} from './validators';

export function isInputSignal<T, TransformT>(
  source: InputSignalWithTransform<T, TransformT>,
): source is InputSignalWithTransform<T, TransformT>;
export function isInputSignal<T>(source: Signal<T>): source is InputSignal<T>;
export function isInputSignal(source: unknown): source is InputSignal<unknown>;
export function isInputSignal<T, TransformT>(
  source: unknown | Signal<T> | InputSignalWithTransform<T, TransformT>,
): source is InputSignal<T> | InputSignalWithTransform<T, TransformT> {
  if (!isSignal(source)) {
    return false;
  }

  const node = (source as InputSignal<T>)[SIGNAL];
  if ('applyValueToInputSignal' in node) {
    return true;
  }

  return false;
}

export function isModelSignal<T>(source: Signal<T>): source is ModelSignal<T>;
export function isModelSignal(source: unknown): source is ModelSignal<unknown>;
export function isModelSignal<T>(source: unknown | Signal<T>): source is ModelSignal<T> {
  if (!isInputSignal(source)) {
    return false;
  }

  const model = source as unknown as WritableSignal<T>;
  if (isFunction(model.set)) {
    return true;
  }

  return false;
}

export function signalAsReadonly<T>(source: Signal<T>): Signal<T> {
  const node = source[SIGNAL];
  const n = node as SignalNode<T> & {readonlyFn?: Signal<T>};
  if (n.readonlyFn === undefined) {
    const readonlyFn = () => {
      producerAccessed(n);
      return n.value;
    };
    (readonlyFn as Signal<T>)[SIGNAL] = n;
    n.readonlyFn = readonlyFn as Signal<T>;
  }
  return n.readonlyFn;
}
