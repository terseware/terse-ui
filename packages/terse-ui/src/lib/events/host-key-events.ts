import {inject, type Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {PerHost, unwrap, type MaybeFn} from '@terse-ui/utils';
import {hostEvent} from './host-events';

export enum Modifier {
  None = 0,
  Ctrl = 0b0001,
  Shift = 0b0010,
  Alt = 0b0100,
  Meta = 0b1000,
}

export type ModifierInput = Modifier | Modifier[];

export type KeyInput = MaybeFn<string | RegExp>;

export type KeyHandler = (event: KeyboardEvent) => void;

export interface KeyBindingOpts {
  readonly modifiers?: MaybeFn<ModifierInput>;
  readonly preventDefault?: MaybeFn<boolean>;
  readonly stopPropagation?: MaybeFn<boolean>;
  readonly ignoreRepeat?: MaybeFn<boolean>;
  readonly currentTarget?: MaybeFn<boolean>;
  readonly when?: (event: KeyboardEvent) => boolean;
  readonly injector?: Injector;
}

interface Binding {
  readonly matcher: (event: KeyboardEvent) => boolean;
  readonly handler: KeyHandler;
  readonly preventDefault: MaybeFn<boolean> | undefined;
  readonly stopPropagation: MaybeFn<boolean> | undefined;
}

@PerHost()
class HostKeyEvents {
  readonly #bindings = new Set<Binding>();

  constructor() {
    hostEvent('keydown', ({event, next}) => {
      for (const binding of this.#bindings.values()) {
        if (binding.matcher(event)) {
          binding.handler(event);
          if (unwrap(binding.preventDefault) ?? true) event.preventDefault();
          if (unwrap(binding.stopPropagation) ?? true) event.stopPropagation();
        }
      }
      next();
    });
  }

  on(key: KeyInput, handler: KeyHandler, opts?: KeyBindingOpts): () => void {
    const {runInContext} = setupContext(opts?.injector, this.on.bind(this));
    return runInContext(({onCleanup}) => {
      const binding: Binding = {
        handler,
        preventDefault: opts?.preventDefault,
        stopPropagation: opts?.stopPropagation,
        matcher: (e) => {
          if (opts?.when && !opts?.when(e)) return false;
          if ((unwrap(opts?.currentTarget) ?? true) && e.target !== e.currentTarget) return false;
          if ((unwrap(opts?.ignoreRepeat) ?? true) && e.repeat) return false;
          if (!matchesModifiers(e, unwrap(opts?.modifiers) ?? Modifier.None)) return false;
          return matchesKey(e, key);
        },
      };

      this.#bindings.add(binding);
      const remove = () => this.#bindings.delete(binding);
      onCleanup(remove);

      return remove;
    });
  }
}

function eventModifiers(event: KeyboardEvent): number {
  let flags = Modifier.None;
  if (event.ctrlKey) flags |= Modifier.Ctrl;
  if (event.shiftKey) flags |= Modifier.Shift;
  if (event.altKey) flags |= Modifier.Alt;
  if (event.metaKey) flags |= Modifier.Meta;
  return flags;
}

function matchesModifiers(event: KeyboardEvent, input: ModifierInput): boolean {
  const actual = eventModifiers(event);
  if (Array.isArray(input)) {
    for (const combo of input) {
      if (actual === combo) return true;
    }
    return false;
  }
  return actual === input;
}

function matchesKey(event: KeyboardEvent, keyInput: KeyInput): boolean {
  const key = unwrap(keyInput);
  if (key instanceof RegExp) return key.test(event.key);
  return key.toLowerCase() === event.key.toLowerCase();
}

export function hostKeyEvent(
  key: KeyInput,
  handler: KeyHandler,
  opts?: KeyBindingOpts,
): () => void {
  const {runInContext} = setupContext(opts?.injector, hostKeyEvent);
  return runInContext(() => inject(HostKeyEvents).on(key, handler, opts));
}
