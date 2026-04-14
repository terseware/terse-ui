import {ElementRef, inject} from '@angular/core';

/** Injects the host `ElementRef`. */
export function injectElementRef<T = HTMLElement>(): ElementRef<T> {
  return inject<ElementRef<T>>(ElementRef);
}

/** Injects the host native element. */
export function injectElement<T = HTMLElement>(): T {
  return injectElementRef<T>().nativeElement;
}
