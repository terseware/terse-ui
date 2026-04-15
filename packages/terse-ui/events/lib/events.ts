import {Directive} from '@angular/core';
import {EventPipeline} from './event-pipeline';

// Keyboard events

@Directive({host: {'(keydown)': 'dispatch($event)'}})
export class OnKeyDown extends EventPipeline<KeyboardEvent> {}

@Directive({host: {'(keyup)': 'dispatch($event)'}})
export class OnKeyUp extends EventPipeline<KeyboardEvent> {}

// Mouse events

@Directive({host: {'(click)': 'dispatch($event)'}})
export class OnClick extends EventPipeline<MouseEvent> {}

@Directive({host: {'(dblclick)': 'dispatch($event)'}})
export class OnDblClick extends EventPipeline<MouseEvent> {}

@Directive({host: {'(mousedown)': 'dispatch($event)'}})
export class OnMouseDown extends EventPipeline<MouseEvent> {}

@Directive({host: {'(mouseup)': 'dispatch($event)'}})
export class OnMouseUp extends EventPipeline<MouseEvent> {}

@Directive({host: {'(mouseenter)': 'dispatch($event)'}})
export class OnMouseEnter extends EventPipeline<MouseEvent> {}

@Directive({host: {'(mouseleave)': 'dispatch($event)'}})
export class OnMouseLeave extends EventPipeline<MouseEvent> {}

// Pointer events

@Directive({host: {'(pointerdown)': 'dispatch($event)'}})
export class OnPointerDown extends EventPipeline<PointerEvent> {}

@Directive({host: {'(pointerup)': 'dispatch($event)'}})
export class OnPointerUp extends EventPipeline<PointerEvent> {}

@Directive({host: {'(pointerenter)': 'dispatch($event)'}})
export class OnPointerEnter extends EventPipeline<PointerEvent> {}

@Directive({host: {'(pointerleave)': 'dispatch($event)'}})
export class OnPointerLeave extends EventPipeline<PointerEvent> {}

// Focus events

@Directive({host: {'(focus)': 'dispatch($event)'}})
export class OnFocus extends EventPipeline<FocusEvent> {}

@Directive({host: {'(blur)': 'dispatch($event)'}})
export class OnBlur extends EventPipeline<FocusEvent> {}

@Directive({host: {'(focusin)': 'dispatch($event)'}})
export class OnFocusIn extends EventPipeline<FocusEvent> {}

@Directive({host: {'(focusout)': 'dispatch($event)'}})
export class OnFocusOut extends EventPipeline<FocusEvent> {}

// Input events

@Directive({host: {'(input)': 'dispatch($event)'}})
export class OnInput extends EventPipeline<Event> {}

@Directive({host: {'(change)': 'dispatch($event)'}})
export class OnChange extends EventPipeline<Event> {}

// Touch events

@Directive({host: {'(touchstart)': 'dispatch($event)'}})
export class OnTouchStart extends EventPipeline<TouchEvent> {}

@Directive({host: {'(touchend)': 'dispatch($event)'}})
export class OnTouchEnd extends EventPipeline<TouchEvent> {}
