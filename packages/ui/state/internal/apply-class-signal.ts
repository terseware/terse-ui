import type {Signal} from '@angular/core';

export function applySignalClass(source: Signal<unknown>, proto: object, sourceKey: PropertyKey) {
  Object.setPrototypeOf(source, proto);
  Object.getOwnPropertyNames(source).forEach((p) => {
    const descriptor = Object.getOwnPropertyDescriptor(source, p);
    if (descriptor) Object.defineProperty(source, p, descriptor);
  });
  Object.defineProperty(source, sourceKey, {value: source});
}
