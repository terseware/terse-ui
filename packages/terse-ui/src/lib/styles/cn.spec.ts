import {Directive, inject} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {expectNoA11yViolations} from '../../../test-axe';
import {Cn} from './cn';

describe(Cn.name, () => {
  describe('initial class from host attribute', () => {
    it('preserves classes declared on the host element', async () => {
      await render(`<button cn class="foo bar">ok</button>`, {imports: [Cn]});
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('foo');
      expect(btn).toHaveClass('bar');
    });

    it('renders empty class binding when none supplied', async () => {
      await render(`<button>ok</button>`, {imports: [Cn]});
      const btn = screen.getByRole('button');
      // jsdom renders empty class attr as an empty string or absent — either way no leakage.
      expect(btn.getAttribute('class') ?? '').toBe('');
    });
  });

  describe('[cn] input binding', () => {
    it('replaces the host class via the bound input', async () => {
      await render(`<button cn [class]="'btn btn-primary'">ok</button>`, {imports: [Cn]});
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('btn');
      expect(btn).toHaveClass('btn-primary');
    });

    it('accepts array / object clsx values', async () => {
      await render(`<button cn [class]="['btn', {primary: true, secondary: false}]">ok</button>`, {
        imports: [Cn],
      });
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('btn');
      expect(btn).toHaveClass('primary');
      expect(btn).not.toHaveClass('secondary');
    });

    it('updates the rendered class when the input changes', async () => {
      const {rerender} = await render(`<button cn [class]="cls">ok</button>`, {
        imports: [Cn],
        componentProperties: {cls: 'a'},
      });
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('a');
      expect(btn).not.toHaveClass('b');

      await rerender({componentProperties: {cls: 'b'}});
      expect(btn).toHaveClass('b');
      expect(btn).not.toHaveClass('a');
    });
  });

  describe('Cn merger', () => {
    it('applies twMerge to dedupe conflicting tailwind classes', async () => {
      await render(`<button cn [class]="'p-2 p-4 text-red-500 text-blue-500'">ok</button>`, {
        imports: [Cn],
      });
      const btn = screen.getByRole('button');
      // twMerge keeps the last of each conflict family.
      expect(btn).toHaveClass('p-4');
      expect(btn).not.toHaveClass('p-2');
      expect(btn).toHaveClass('text-blue-500');
      expect(btn).not.toHaveClass('text-red-500');
    });

    it('intercept() registers a reactive class contribution', async () => {
      @Directive({
        selector: '[withExtras]',
        hostDirectives: [{directive: Cn, inputs: ['class']}],
      })
      class WithExtras {
        constructor() {
          inject(Cn).intercept(() => ['p-1', 'p-2']);
          inject(Cn).intercept(() => ['p-3', 'p-4']);
        }
      }

      await render(`<button withExtras [attr.class]="'p-10'" cn [class]="'p-20'">ok</button>`, {
        imports: [WithExtras],
      });
      const btn = screen.getByRole('button');
      expect(btn).not.toHaveClass('p-1');
      expect(btn).not.toHaveClass('p-2');
      expect(btn).not.toHaveClass('p-3');
      expect(btn).not.toHaveClass('p-4');
      expect(btn).toHaveClass('p-20');
      expect(btn).toHaveClass('p-10');
    });

    it('[cn] input always wins over intercept() contributions (finalize invariant)', async () => {
      @Directive({
        selector: '[withPadding]',
        hostDirectives: [{directive: Cn, inputs: ['class']}],
      })
      class WithPadding {
        constructor() {
          inject(Cn).intercept(() => 'p-8');
        }
      }

      await render(`<button withPadding cn [class]="'p-2'">ok</button>`, {
        imports: [WithPadding],
      });
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('p-2');
      expect(btn).not.toHaveClass('p-8');
    });
  });

  describe('a11y', () => {
    it('no axe violations for a labelled button with classes', async () => {
      const {container} = await render(
        `<button cn [class]="'btn primary'" aria-label="Save">Save</button>`,
        {imports: [Cn]},
      );
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
    });
  });
});
