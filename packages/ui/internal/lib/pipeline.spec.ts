import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  numberAttribute,
  type ListenerOptions,
} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {EVENT_MANAGER_PLUGINS, EventManagerPlugin} from '@angular/platform-browser';
import {render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {expectNoA11yViolations} from '../../test-axe';
import {on} from './event-pipeline';
import {hostAttr} from './host-attributes';
import {injectElement} from './inject-element';
import {ValuePipeline} from './pipeline';
import {hasDisabledAttribute, isBoolean} from './validators';

@Directive({
  exportAs: 'tabIndex',
  host: {'[tabIndex]': 'this()'},
})
export class TabIndex extends ValuePipeline<number> {
  readonly #init = numberAttribute(hostAttr('tabindex'), 0);
  readonly tabIndex = input(this.#init, {transform: (v) => numberAttribute(v, this.#init)});
  constructor() {
    super(computed(() => this.tabIndex()));
  }
}

@Directive({
  exportAs: 'ariaDisabled',
  host: {'[attr.aria-disabled]': 'attr()'},
})
export class AriaDisabled extends ValuePipeline<'true' | 'false' | boolean | null> {
  protected readonly attr = computed((): string | null => {
    const result = this();
    return isBoolean(result) ? (result ? 'true' : 'false') : result;
  });
  constructor() {
    super(null);
  }
}

@Directive({
  exportAs: 'dataDisabled',
  host: {'[attr.data-disabled]': 'attr()'},
})
export class DataDisabled extends ValuePipeline<string | boolean | null> {
  protected readonly attr = computed((): string | null => {
    const result = this();
    return isBoolean(result) ? (result ? '' : null) : result;
  });
  constructor() {
    super(null);
  }
}

const CLICK = Symbol('click');

@Directive({
  host: {'(click.terse)': 'onClick($any($event))'},
})
export class OnClick {
  constructor() {
    Object.defineProperty(injectElement, CLICK, {value: this, configurable: true});
  }

  onClick(event: MouseEvent) {
    event.stopImmediatePropagation();
    console.log('sadsadsa', event);
    return () => {
      console.log('onCwqdqdlick returned', event);
    };
  }
}

@Directive({
  exportAs: 'disabled',
  hostDirectives: [TabIndex, AriaDisabled, DataDisabled, OnClick],
  host: {
    '[attr.disabled]': 'attr()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class Disabled extends ValuePipeline<'soft' | 'hard' | null> {
  readonly #native = hasDisabledAttribute(injectElement());
  readonly disabled = input(false, {transform: booleanAttribute});
  readonly softDisabled = input(false, {transform: booleanAttribute});
  readonly soft = computed(() => this() === 'soft');
  readonly hard = computed(() => this() === 'hard');
  protected readonly attr = computed(() => (this.#native && this.hard() ? '' : null));
  constructor() {
    super(computed(() => (this.softDisabled() ? 'soft' : this.disabled() ? 'hard' : null)));
    inject(DataDisabled).use(({next}) => next() ?? this());
    inject(AriaDisabled).use(({next}) => {
      let ariaDisabled = next();
      if ((this.#native && this.soft()) || (!this.#native && this())) {
        ariaDisabled ??= !!this();
      }
      return ariaDisabled;
    });
    inject(TabIndex).use(({next}) => {
      let tabIndex = next();
      if (!this.#native && this()) {
        tabIndex = this.soft() ? tabIndex : Math.min(-1, tabIndex);
      }
      return tabIndex;
    });
    // listener.capture(injectElement(), 'click', (event) => {});
    on('click', ({next, event}) => {
      console.log('OnClick', this());
      if (this()) {
        event.stopImmediatePropagation();
        return;
      }
      return next();
    });
  }
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.soft() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
    }
  }
}

@Directive({
  selector: '[testDisabled]',
  exportAs: 'testDisabled',
  hostDirectives: [
    {directive: Disabled, inputs: ['disabled', 'softDisabled']},
    {directive: TabIndex, inputs: ['tabIndex']},
  ],
})
export class TestDisabled {}

function dispatchKey(el: HTMLElement, type: 'keydown' | 'keyup', key: string) {
  const event = new KeyboardEvent(type, {key, bubbles: true, cancelable: true});
  el.dispatchEvent(event);
  return event;
}

export class ClickEventPlugin extends EventManagerPlugin {
  override supports(eventName: string): boolean {
    return eventName === 'click.terse'; // '.unterse'
  }
  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: MouseEvent) => void,
    options?: ListenerOptions,
  ): Function {
    const onClick = (element as unknown as Record<symbol, OnClick>)[CLICK];
    if (onClick) {
      const h = (e) => {
        onClick.onClick(e);
        handler(e);
      };
      element.addEventListener(eventName, h as EventListener, options);
      return () => element.removeEventListener(eventName, h as EventListener, options);
    }
    element.addEventListener(eventName, handler as EventListener, options);
    return () => this.removeEventListener(element, eventName, handler as EventListener, options);
  }

  removeEventListener(
    target: any,
    eventName: string,
    callback: Function,
    options?: ListenerOptions,
  ): void {
    return target.removeEventListener(eventName, callback as EventListener, options);
  }
}

describe('Activatable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EVENT_MANAGER_PLUGINS,
          useClass: ClickEventPlugin,
          multi: true,
        },
      ],
    });
  });
  describe('disabled states', () => {
    it('hard disabled: sets disabled attribute on native elements', async () => {
      await render(`<button testDisabled disabled></button>`, {imports: [TestDisabled]});
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');
      expect(button).not.toHaveAttribute('aria-disabled');
    });

    it('hard disabled: sets aria-disabled on non-native elements', async () => {
      await render(`<span testDisabled role="button" disabled></span>`, {
        imports: [TestDisabled],
      });
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('data-disabled', 'hard');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('tabindex', '-1');
    });

    it('soft disabled (softDisabled): removes native disabled and adds aria-disabled', async () => {
      await render(`<button testDisabled disabled softDisabled></button>`, {
        imports: [TestDisabled],
      });
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('soft disabled: non-native element gets aria-disabled and remains focusable', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('data-disabled', 'soft');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('tabindex', '0');
    });

    it('not disabled: no disabled attributes', async () => {
      await render(`<button testDisabled></button>`, {imports: [TestDisabled]});
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).toHaveAttribute('tabindex', '0');
    });
  });

  describe('tabIndex', () => {
    it('defaults to 0', async () => {
      await render(`<button testDisabled></button>`, {imports: [TestDisabled]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('respects custom tabIndex', async () => {
      await render(`<button testDisabled [tabIndex]="3"></button>`, {
        imports: [TestDisabled],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 3);
    });

    it('sets tabIndex to -1 when hard disabled on non-native elements', async () => {
      await render(`<span testDisabled role="button" disabled></span>`, {
        imports: [TestDisabled],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', -1);
    });

    it('preserves tabIndex when soft disabled', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('preserves custom tabIndex when soft disabled', async () => {
      await render(`<span testDisabled role="button" tabindex="5" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '5');
    });
  });

  describe('keyboard events — soft disabled', () => {
    it('blocks Enter key', async () => {
      const {fixture} = await render(
        `<span testDisabled role="button" disabled softDisabled></span>`,
        {
          imports: [TestDisabled],
        },
      );

      const el = screen.getByRole('button');
      el.focus();
      fixture.detectChanges();

      const event = dispatchKey(el, 'keydown', 'Enter');
      expect(event.defaultPrevented).toBe(true);
    });

    it('blocks Space key', async () => {
      const {fixture} = await render(
        `<span testDisabled role="button" disabled softDisabled></span>`,
        {
          imports: [TestDisabled],
        },
      );

      const el = screen.getByRole('button');
      el.focus();
      fixture.detectChanges();

      const event = dispatchKey(el, 'keydown', ' ');
      expect(event.defaultPrevented).toBe(true);
    });

    it('allows Tab key', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });

      const el = screen.getByRole('button');
      el.focus();

      const event = dispatchKey(el, 'keydown', 'Tab');
      expect(event.defaultPrevented).toBe(false);
    });

    it('allows arrow keys for container navigation', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });

      const el = screen.getByRole('button');
      el.focus();

      for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
        const event = dispatchKey(el, 'keydown', key);
        expect(event.defaultPrevented).toBe(false);
      }
    });

    it('allows Escape key for dismissal', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });

      const el = screen.getByRole('button');
      el.focus();

      const event = dispatchKey(el, 'keydown', 'Escape');
      expect(event.defaultPrevented).toBe(false);
    });

    it('allows Home and End keys for navigation', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });

      const el = screen.getByRole('button');
      el.focus();

      for (const key of ['Home', 'End']) {
        const event = dispatchKey(el, 'keydown', key);
        expect(event.defaultPrevented).toBe(false);
      }
    });
  });

  describe('click blocking', () => {
    it('blocks click when hard disabled', async () => {
      const clickSpy = vi.fn();
      await render(`<div testDisabled role="button" disabled (click)="onClick()"></div>`, {
        imports: [TestDisabled],
        componentProperties: {onClick: clickSpy},
      });

      screen.getByRole('button').click();
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('blocks click when soft disabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<div testDisabled role="button" disabled softDisabled (click)="onClick()"></div>`,
        {
          imports: [TestDisabled],
          componentProperties: {onClick: clickSpy},
        },
      );

      screen.getByRole('button').click();
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('allows click when not disabled', async () => {
      const clickSpy = vi.fn();
      await render(`<div testDisabled role="button" tabindex="0" (click)="onClick()"></div>`, {
        imports: [TestDisabled],
        componentProperties: {onClick: clickSpy},
      });

      screen.getByRole('button').click();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('focus management', () => {
    it('hard disabled native button is not focusable', async () => {
      await render(`<button testDisabled disabled></button>`, {imports: [TestDisabled]});
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).not.toHaveFocus();
    });

    it('soft disabled element is focusable', async () => {
      await render(`<button testDisabled disabled softDisabled></button>`, {
        imports: [TestDisabled],
      });
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('hard disabled non-native is not focusable via Tab', async () => {
      await render(`<span testDisabled role="button" disabled></span>`, {
        imports: [TestDisabled],
      });
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).not.toHaveFocus();
    });

    it('allows focus and blur when soft disabled', async () => {
      await render(`<span testDisabled role="button" disabled softDisabled></span>`, {
        imports: [TestDisabled],
      });

      const el = screen.getByRole('button');
      el.focus();
      expect(el).toHaveFocus();

      el.blur();
      expect(el).not.toHaveFocus();
    });
  });

  describe('state transitions', () => {
    it('should update attributes when disabled changes dynamically', async () => {
      const {rerender, fixture} = await render(
        `<button testDisabled [disabled]="isDisabled"></button>`,
        {imports: [TestDisabled], componentProperties: {isDisabled: false}},
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');

      await rerender({componentProperties: {isDisabled: true}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');

      await rerender({componentProperties: {isDisabled: false}});
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
    });

    it('should switch between hard and soft disable', async () => {
      const {rerender, fixture} = await render(
        `<button testDisabled [disabled]="true" [softDisabled]="softDisabled"></button>`,
        {imports: [TestDisabled], componentProperties: {softDisabled: false}},
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-disabled', 'hard');
      expect(button).toHaveAttribute('disabled');

      await rerender({componentProperties: {softDisabled: true}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('element types', () => {
    it('should use native disabled on input elements', async () => {
      await render(`<input testDisabled disabled type="text" />`, {
        imports: [TestDisabled],
      });
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('disabled');
      expect(input).toHaveAttribute('data-disabled', 'hard');
    });

    it('should use native disabled on select elements', async () => {
      await render(`<select testDisabled disabled><option>A</option></select>`, {
        imports: [TestDisabled],
      });
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('disabled');
    });

    it('should use aria-disabled on anchor elements', async () => {
      await render(`<a testDisabled disabled href="#">Link</a>`, {imports: [TestDisabled]});
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).not.toHaveAttribute('disabled');
    });

    it('should use aria-disabled on div elements', async () => {
      await render(`<div testDisabled disabled role="button">Action</div>`, {
        imports: [TestDisabled],
      });
      const el = screen.getByRole('button');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).not.toHaveAttribute('disabled');
    });
  });

  describe('axe a11y', () => {
    it('no violations on a hard-disabled native button', async () => {
      const {container} = await render(
        `<button testDisabled disabled aria-label="Submit">Submit</button>`,
        {imports: [TestDisabled]},
      );
      await expectNoA11yViolations(container);
    });

    it('no violations on a soft-disabled non-native button', async () => {
      // Soft-disabled must stay focusable AND signal state via aria-disabled
      // — axe checks that aria-disabled is valid on a role=button element.
      const {container} = await render(
        `<span testDisabled role="button" disabled softDisabled aria-label="Save">Save</span>`,
        {imports: [TestDisabled]},
      );
      await expectNoA11yViolations(container);
    });

    it('no violations when loading state cycles hard/soft transitions', async () => {
      const {rerender, container} = await render(
        `<button testDisabled [disabled]="load" [softDisabled]="load" aria-label="Go">Go</button>`,
        {imports: [TestDisabled], componentProperties: {load: false}},
      );
      await expectNoA11yViolations(container);
      await rerender({componentProperties: {load: true}});
      await expectNoA11yViolations(container);
      await rerender({componentProperties: {load: false}});
      await expectNoA11yViolations(container);
    });
  });

  describe('loading state use case', () => {
    it('should maintain focusability during loading transitions', async () => {
      const {rerender, fixture} = await render(
        `<button testDisabled [disabled]="isLoading" [softDisabled]="isLoading">Submit</button>`,
        {imports: [TestDisabled], componentProperties: {isLoading: false}},
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');

      // Start loading
      await rerender({componentProperties: {isLoading: true}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-disabled', 'soft');

      // Finish loading
      await rerender({componentProperties: {isLoading: false}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-disabled');
    });
  });
});
