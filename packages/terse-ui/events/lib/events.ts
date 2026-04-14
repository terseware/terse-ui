import {Directive} from '@angular/core';
import {EventPipeline} from './event-pipeline';

// Keyboard events

@Directive({
  exportAs: 'onKeyDown',
  host: {'(keydown)': 'dispatch($event)'},
})
export class OnKeyDown extends EventPipeline<KeyboardEvent> {}

@Directive({
  exportAs: 'onKeyUp',
  host: {'(keyup)': 'dispatch($event)'},
})
export class OnKeyUp extends EventPipeline<KeyboardEvent> {}

// Mouse events

@Directive({
  exportAs: 'onClick',
  host: {'(click)': 'dispatch($event)'},
})
export class OnClick extends EventPipeline<MouseEvent> {}

@Directive({
  exportAs: 'onDblClick',
  host: {'(dblclick)': 'dispatch($event)'},
})
export class OnDblClick extends EventPipeline<MouseEvent> {}

@Directive({
  exportAs: 'onMouseDown',
  host: {'(mousedown)': 'dispatch($event)'},
})
export class OnMouseDown extends EventPipeline<MouseEvent> {}

@Directive({
  exportAs: 'onMouseUp',
  host: {'(mouseup)': 'dispatch($event)'},
})
export class OnMouseUp extends EventPipeline<MouseEvent> {}

@Directive({
  exportAs: 'onMouseEnter',
  host: {'(mouseenter)': 'dispatch($event)'},
})
export class OnMouseEnter extends EventPipeline<MouseEvent> {}

@Directive({
  exportAs: 'onMouseLeave',
  host: {'(mouseleave)': 'dispatch($event)'},
})
export class OnMouseLeave extends EventPipeline<MouseEvent> {}

// Pointer events

@Directive({
  exportAs: 'onPointerDown',
  host: {'(pointerdown)': 'dispatch($event)'},
})
export class OnPointerDown extends EventPipeline<PointerEvent> {}

@Directive({
  exportAs: 'onPointerUp',
  host: {'(pointerup)': 'dispatch($event)'},
})
export class OnPointerUp extends EventPipeline<PointerEvent> {}

@Directive({
  exportAs: 'onPointerEnter',
  host: {'(pointerenter)': 'dispatch($event)'},
})
export class OnPointerEnter extends EventPipeline<PointerEvent> {}

@Directive({
  exportAs: 'onPointerLeave',
  host: {'(pointerleave)': 'dispatch($event)'},
})
export class OnPointerLeave extends EventPipeline<PointerEvent> {}

// Focus events

@Directive({
  exportAs: 'onFocus',
  host: {'(focus)': 'dispatch($event)'},
})
export class OnFocus extends EventPipeline<FocusEvent> {}

@Directive({
  exportAs: 'onBlur',
  host: {'(blur)': 'dispatch($event)'},
})
export class OnBlur extends EventPipeline<FocusEvent> {}

@Directive({
  exportAs: 'onFocusIn',
  host: {'(focusin)': 'dispatch($event)'},
})
export class OnFocusIn extends EventPipeline<FocusEvent> {}

@Directive({
  exportAs: 'onFocusOut',
  host: {'(focusout)': 'dispatch($event)'},
})
export class OnFocusOut extends EventPipeline<FocusEvent> {}

// Input events

@Directive({
  exportAs: 'onInput',
  host: {'(input)': 'dispatch($event)'},
})
export class OnInput extends EventPipeline<Event> {}

@Directive({
  exportAs: 'onChange',
  host: {'(change)': 'dispatch($event)'},
})
export class OnChange extends EventPipeline<Event> {}

// Touch events

@Directive({
  exportAs: 'onTouchStart',
  host: {'(touchstart)': 'dispatch($event)'},
})
export class OnTouchStart extends EventPipeline<TouchEvent> {}

@Directive({
  exportAs: 'onTouchEnd',
  host: {'(touchend)': 'dispatch($event)'},
})
export class OnTouchEnd extends EventPipeline<TouchEvent> {}
