import {Directive, inject} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {expectNoA11yViolations} from '../../test-axe';
import {Classes, TwClasses} from './classes';

@Directive({
  selector: '[terseClasses]',
  hostDirectives: [{directive: Classes, inputs: ['class', 'classesMerger']}],
})
class TestClasses {}

@Directive({
  selector: '[terseTwClasses]',
  hostDirectives: [{directive: TwClasses, inputs: ['class']}],
})
class TestTwClasses {}

describe('Classes atom', () => {
  describe('initial class from host attribute', () => {
    it('preserves classes declared on the host element', async () => {
      await render(`<button terseClasses class="foo bar">ok</button>`, {
        imports: [TestClasses],
      });
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('foo');
      expect(btn).toHaveClass('bar');
    });

    it('renders empty class binding when none supplied', async () => {
      await render(`<button terseClasses>ok</button>`, {imports: [TestClasses]});
      const btn = screen.getByRole('button');
      // jsdom renders empty class attr as an empty string or absent — either way no leakage.
      expect(btn.getAttribute('class') ?? '').toBe('');
    });
  });

  describe('[class] input binding', () => {
    it('replaces the host class via the bound input', async () => {
      await render(`<button terseClasses [class]="'btn btn-primary'">ok</button>`, {
        imports: [TestClasses],
      });
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('btn');
      expect(btn).toHaveClass('btn-primary');
    });

    it('accepts array / object clsx values', async () => {
      await render(
        `<button terseClasses [class]="['btn', {primary: true, secondary: false}]">ok</button>`,
        {imports: [TestClasses]},
      );
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('btn');
      expect(btn).toHaveClass('primary');
      expect(btn).not.toHaveClass('secondary');
    });

    it('updates the rendered class when the input changes', async () => {
      const {rerender} = await render(`<button terseClasses [class]="cls">ok</button>`, {
        imports: [TestClasses],
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

  describe('TwClasses merger', () => {
    it('applies twMerge to dedupe conflicting tailwind classes', async () => {
      await render(
        `<button terseTwClasses [class]="'p-2 p-4 text-red-500 text-blue-500'">ok</button>`,
        {imports: [TestTwClasses]},
      );
      const btn = screen.getByRole('button');
      // twMerge keeps the last of each conflict family.
      expect(btn).toHaveClass('p-4');
      expect(btn).not.toHaveClass('p-2');
      expect(btn).toHaveClass('text-blue-500');
      expect(btn).not.toHaveClass('text-red-500');
    });

    it('classes() registers a reactive class contribution', async () => {
      @Directive({
        selector: '[withExtras]',
        hostDirectives: [{directive: TwClasses, inputs: ['class']}],
      })
      class WithExtras {
        constructor() {
          inject(TwClasses).classes(() => ['extra-1', 'extra-2']);
        }
      }

      await render(`<button withExtras [class]="'base'">ok</button>`, {
        imports: [WithExtras],
      });
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('base');
      expect(btn).toHaveClass('extra-1');
      expect(btn).toHaveClass('extra-2');
    });
  });

  describe('a11y', () => {
    it('no axe violations for a labelled button with classes', async () => {
      const {container} = await render(
        `<button terseClasses [class]="'btn primary'" aria-label="Save">Save</button>`,
        {imports: [TestClasses]},
      );
      await expectNoA11yViolations(container);
    });
  });
});
