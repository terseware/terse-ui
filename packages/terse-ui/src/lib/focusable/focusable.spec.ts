import {By} from '@angular/platform-browser';
import {render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {TerseFocusable} from './terse-focusable';

// ---------------------------------------------------------------------------
// Disabler-only behaviors. Tests here never assume role/keyboard-activation
// semantics — those belong to Button. When a non-native element is used,
// role="button" is set explicitly so `screen.getByRole('button')` resolves.
// ---------------------------------------------------------------------------

describe(TerseFocusable.name, () => {
  describe('disabled attribute (native elements)', () => {
    it('sets disabled on <button> when hard-disabled', async () => {
      await render(`<button terseFocusable disabled>Go</button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('does not set disabled on <button> when soft-disabled', async () => {
      await render(`<button terseFocusable disabled="soft">Go</button>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
    });

    it('does not set disabled on <button> when enabled', async () => {
      await render(`<button terseFocusable>Go</button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
    });

    it('sets disabled on <input type=button> when hard-disabled', async () => {
      await render(`<input terseFocusable type="button" disabled value="Go" />`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('sets disabled on <input type=submit> when hard-disabled', async () => {
      await render(`<input terseFocusable type="submit" disabled value="Go" />`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('never sets disabled attribute on non-native elements', async () => {
      const {container} = await render(`<a terseFocusable disabled>Link</a>`, {
        imports: [TerseFocusable],
      });
      const anchor = container.querySelector('a');
      expect(anchor).not.toHaveAttribute('disabled');
    });
  });

  describe('data-disabled attribute', () => {
    it('is absent when enabled', async () => {
      await render(`<button terseFocusable>Go</button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).not.toHaveAttribute('data-disabled');
    });

    it('is "hard" when hard-disabled', async () => {
      await render(`<button terseFocusable disabled>Go</button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
    });

    it('is "soft" when soft-disabled', async () => {
      await render(`<button terseFocusable disabled="soft">Go</button>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'soft');
    });

    it('updates when the input changes', async () => {
      const {rerender, fixture} = await render(
        `<button terseFocusable [disabled]="d">Go</button>`,
        {
          imports: [TerseFocusable],
          componentProperties: {d: false as boolean | 'soft'},
        },
      );
      const btn = screen.getByRole('button');
      expect(btn).not.toHaveAttribute('data-disabled');

      await rerender({componentProperties: {d: true}});
      fixture.detectChanges();
      expect(btn).toHaveAttribute('data-disabled', 'hard');

      await rerender({componentProperties: {d: 'soft'}});
      fixture.detectChanges();
      expect(btn).toHaveAttribute('data-disabled', 'soft');

      await rerender({componentProperties: {d: false}});
      fixture.detectChanges();
      expect(btn).not.toHaveAttribute('data-disabled');
    });

    it('is set on non-native elements too', async () => {
      await render(`<div terseFocusable role="button" disabled>Do</div>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
    });
  });

  describe('aria-disabled attribute', () => {
    it('is absent when native <button> is hard-disabled', async () => {
      // Native `disabled` attribute supersedes aria-disabled per WAI-ARIA.
      await render(`<button terseFocusable disabled>Go</button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });

    it('is "true" on native <button> when soft-disabled', async () => {
      await render(`<button terseFocusable disabled="soft">Go</button>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('is "true" on non-native element when hard-disabled', async () => {
      await render(`<div terseFocusable role="button" disabled>Do</div>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('is "true" on non-native element when soft-disabled', async () => {
      await render(`<div terseFocusable role="button" disabled="soft">Do</div>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('is absent when enabled', async () => {
      await render(`<div terseFocusable role="button">Do</div>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('tabindex', () => {
    it('defaults to 0', async () => {
      await render(`<button terseFocusable>Go</button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('respects an explicit [tabIndex] input', async () => {
      await render(`<button terseFocusable [tabIndex]="3">Go</button>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 3);
    });

    it('is -1 on non-native elements when hard-disabled', async () => {
      await render(`<span terseFocusable role="button" disabled>Do</span>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', -1);
    });

    it('stays 0 on non-native elements when soft-disabled', async () => {
      await render(`<span terseFocusable role="button" disabled="soft">Do</span>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('keep host token value', async () => {
      await render(`<span terseFocusable role="button" tabindex="-1" disabled="soft">Do</span>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', -1);
    });
  });

  describe('focus management', () => {
    it('hard-disabled native <button> is not reachable via Tab', async () => {
      await render(`<button terseFocusable disabled>Go</button>`, {imports: [TerseFocusable]});
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).not.toHaveFocus();
    });

    it('soft-disabled native <button> is reachable via Tab', async () => {
      await render(`<button terseFocusable disabled="soft">Go</button>`, {
        imports: [TerseFocusable],
      });
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('soft-disabled non-native element is reachable via Tab', async () => {
      await render(`<span terseFocusable role="button" disabled="soft">Do</span>`, {
        imports: [TerseFocusable],
      });
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('hard-disabled non-native element is not reachable via Tab (tabindex=-1)', async () => {
      await render(`<span terseFocusable role="button" disabled>Do</span>`, {
        imports: [TerseFocusable],
      });
      await userEvent.keyboard('[Tab]');
      expect(screen.getByRole('button')).not.toHaveFocus();
    });

    it('allows blur when soft-disabled', async () => {
      const blurSpy = vi.fn();
      await render(
        `<span terseFocusable role="button" disabled="soft" (blur)="onBlur()">Do</span>`,
        {imports: [TerseFocusable], componentProperties: {onBlur: blurSpy}},
      );
      const el = screen.getByRole('button');
      el.focus();
      expect(el).toHaveFocus();
      el.blur();
      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(el).not.toHaveFocus();
    });
  });

  describe('keydown on soft-disabled', () => {
    it('prevents default on Enter/Space', async () => {
      await render(`<span terseFocusable role="button" disabled="soft">Do</span>`, {
        imports: [TerseFocusable],
      });
      const el = screen.getByRole('button');
      el.focus();

      const enter = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true});
      el.dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(true);
    });

    it('does NOT prevent default on Tab', async () => {
      await render(`<span terseFocusable role="button" disabled="soft">Do</span>`, {
        imports: [TerseFocusable],
      });
      const el = screen.getByRole('button');
      el.focus();

      const tab = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
      el.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(false);
    });
  });

  describe('disabled state transitions', () => {
    it('cycles enabled → hard → soft → enabled cleanly', async () => {
      const {rerender, fixture} = await render(
        `<button terseFocusable [disabled]="d">Go</button>`,
        {
          imports: [TerseFocusable],
          componentProperties: {d: false as boolean | 'soft'},
        },
      );
      const btn = screen.getByRole('button');

      expect(btn).not.toHaveAttribute('disabled');
      expect(btn).not.toHaveAttribute('data-disabled');
      expect(btn).not.toHaveAttribute('aria-disabled');
      expect(btn).toHaveProperty('tabIndex', 0);

      await rerender({componentProperties: {d: true}});
      fixture.detectChanges();
      expect(btn).toHaveAttribute('disabled');
      expect(btn).toHaveAttribute('data-disabled', 'hard');
      expect(btn).not.toHaveAttribute('aria-disabled');

      await rerender({componentProperties: {d: 'soft'}});
      fixture.detectChanges();
      expect(btn).not.toHaveAttribute('disabled');
      expect(btn).toHaveAttribute('data-disabled', 'soft');
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn).toHaveProperty('tabIndex', 0);

      await rerender({componentProperties: {d: false}});
      fixture.detectChanges();
      expect(btn).not.toHaveAttribute('disabled');
      expect(btn).not.toHaveAttribute('data-disabled');
      expect(btn).not.toHaveAttribute('aria-disabled');
    });

    it('preserves tabindex through a loading-state cycle (soft-on-soft)', async () => {
      const {rerender, fixture} = await render(
        `<button terseFocusable [disabled]="loading ? 'soft' : false">
           {{ loading ? 'Loading...' : 'Submit' }}
         </button>`,
        {imports: [TerseFocusable], componentProperties: {loading: false}},
      );
      const btn = screen.getByRole('button');
      expect(btn).toHaveProperty('tabIndex', 0);

      await rerender({componentProperties: {loading: true}});
      fixture.detectChanges();
      expect(btn).toHaveProperty('tabIndex', 0);
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn).toHaveAttribute('data-disabled', 'soft');

      await rerender({componentProperties: {loading: false}});
      fixture.detectChanges();
      expect(btn).toHaveProperty('tabIndex', 0);
      expect(btn).not.toHaveAttribute('aria-disabled');
      expect(btn).not.toHaveAttribute('data-disabled');
    });
  });

  describe('anchor with href', () => {
    it('gets data-disabled + aria-disabled but no disabled attribute', async () => {
      const {container} = await render(`<a terseFocusable href="/x" disabled>Go</a>`, {
        imports: [TerseFocusable],
      });
      const link = container.querySelector('a')!;
      expect(link).toHaveAttribute('data-disabled', 'hard');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).not.toHaveAttribute('disabled');
    });

    it('remains tabbable when soft-disabled', async () => {
      const {container} = await render(`<a terseFocusable href="/x" disabled="soft">Go</a>`, {
        imports: [TerseFocusable],
      });
      const link = container.querySelector('a')!;
      expect(link).toHaveAttribute('data-disabled', 'soft');
      expect(link).toHaveProperty('tabIndex', 0);
    });
  });

  describe('element types', () => {
    it('works on <button>', async () => {
      await render(`<button terseFocusable></button>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button').tagName).toBe('BUTTON');
    });

    it('works on <a href> (link)', async () => {
      const {container} = await render(`<a terseFocusable href="#">Go</a>`, {
        imports: [TerseFocusable],
      });
      expect(container.querySelector('a')!.tagName).toBe('A');
    });

    it('works on <div role=button>', async () => {
      await render(`<div terseFocusable role="button">Do</div>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button').tagName).toBe('DIV');
    });

    it('works on <span role=button>', async () => {
      await render(`<span terseFocusable role="button">Do</span>`, {imports: [TerseFocusable]});
      expect(screen.getByRole('button').tagName).toBe('SPAN');
    });

    it('works on <input type=button>', async () => {
      await render(`<input terseFocusable type="button" value="Go" />`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button').tagName).toBe('INPUT');
    });

    it('does not force a role on bare <div>', async () => {
      // Disabler does not auto-assign role=button — that's Button's job.
      const {container} = await render(`<div terseFocusable>Do</div>`, {imports: [TerseFocusable]});
      const div = container.querySelector('div[terseFocusable]')!;
      expect(div.getAttribute('role')).toBeNull();
    });
  });

  describe('arbitrary props', () => {
    it('passes data attributes through to the host element', async () => {
      await render(`<button terseFocusable data-testid="go-btn">Go</button>`, {
        imports: [TerseFocusable],
      });
      expect(screen.getByRole('button')).toHaveAttribute('data-testid', 'go-btn');
    });

    it('preserves custom role through disabled transitions', async () => {
      const {rerender, fixture} = await render(
        `<div terseFocusable role="tab" [disabled]="d">Tab</div>`,
        {imports: [TerseFocusable], componentProperties: {d: false as boolean | 'soft'}},
      );
      const el = screen.getByRole('tab');
      expect(el).toHaveAttribute('role', 'tab');

      await rerender({componentProperties: {d: true}});
      fixture.detectChanges();
      expect(el).toHaveAttribute('role', 'tab');
      expect(el).toHaveAttribute('data-disabled', 'hard');

      await rerender({componentProperties: {d: false}});
      fixture.detectChanges();
      expect(el).toHaveAttribute('role', 'tab');
      expect(el).not.toHaveAttribute('data-disabled');
    });
  });

  describe('debugElement queries (non-role targets)', () => {
    // Kept because anchors can't be queried by role in a disabled context
    // once aria-disabled is on them — axe considers them a link regardless.
    it('anchor without href stays without native disabled attribute', async () => {
      const {debugElement} = await render(`<a terseFocusable disabled>No href</a>`, {
        imports: [TerseFocusable],
      });
      const anchor = debugElement.query(By.css('a')).nativeElement;
      expect(anchor).not.toHaveAttribute('disabled');
      expect(anchor).toHaveAttribute('data-disabled', 'hard');
    });
    it('div stays without native disabled attribute', async () => {
      const {debugElement} = await render(`<div terseFocusable disabled>Do</div>`, {
        imports: [TerseFocusable],
      });
      const inp = debugElement.query(By.css('div')).nativeElement;
      expect(inp).not.toHaveAttribute('disabled');
      expect(inp).toHaveAttribute('data-disabled', 'hard');
    });
  });
});
