import {Component, Directive, inject, viewChild} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {Anchor} from './anchor';
import {Anchored} from './anchored';
import {TerseAnchor} from './terse-anchor';
import {TerseAnchored} from './terse-anchored';

const IMPORTS = [TerseAnchor, TerseAnchored];

describe('Anchor', () => {
  it('emits a unique --anchor-* name onto the host style', async () => {
    await render(
      `<button terseAnchor aria-label="a">A</button>
       <button terseAnchor aria-label="b">B</button>`,
      {imports: IMPORTS},
    );
    const a = screen.getByRole('button', {name: 'a'});
    const b = screen.getByRole('button', {name: 'b'});

    expect(a.style.getPropertyValue('anchor-name')).toMatch(/^--anchor-\d+$/);
    expect(b.style.getPropertyValue('anchor-name')).toMatch(/^--anchor-\d+$/);
    expect(a.style.getPropertyValue('anchor-name')).not.toBe(
      b.style.getPropertyValue('anchor-name'),
    );
  });

  it('exposes the generated name via the `value` field', async () => {
    @Directive({selector: '[host]', hostDirectives: [TerseAnchor]})
    class Host {
      readonly anchor = inject(Anchor);
    }

    const {fixture} = await render(`<button host>A</button>`, {imports: [Host]});
    const host = fixture.debugElement.children[0].injector.get(Host);
    expect(host.anchor.value).toMatch(/^--anchor-\d+$/);
  });
});

describe('Anchored', () => {
  it('writes position/position-area/position-try-fallbacks defaults', async () => {
    await render(`<div [terseAnchored]="'--anchor-x'" aria-label="popover">P</div>`, {
      imports: IMPORTS,
    });
    const popover = screen.getByLabelText('popover');

    expect(popover.style.getPropertyValue('position')).toBe('fixed');
    expect(popover.style.getPropertyValue('position-area')).toBe('bottom');
    // Default fallbacks joined with a comma per CSS `position-try-fallbacks` syntax.
    expect(popover.style.getPropertyValue('position-try-fallbacks')).toBe(
      'flip-block, flip-inline, flip-block flip-inline',
    );
  });

  it('reflects data-side / data-align / data-offset', async () => {
    @Component({
      selector: 'test-host',
      imports: IMPORTS,
      template: `<div
        aria-label="popover"
        terseAnchored
        terseAnchoredSide="top"
        [terseAnchoredMargin]="8"
      >
        P
      </div>`,
    })
    class Host {}

    await render(Host);
    const popover = screen.getByLabelText('popover');

    expect(popover).toHaveAttribute('data-side', 'top');
    expect(popover).toHaveAttribute('data-align', 'top');
    expect(popover).toHaveAttribute('data-offset', '8px');
  });

  it('keeps a string margin verbatim as the data-offset value', async () => {
    await render(`<div terseAnchored terseAnchoredMargin="1rem" aria-label="popover">P</div>`, {
      imports: IMPORTS,
    });
    expect(screen.getByLabelText('popover')).toHaveAttribute('data-offset', '1rem');
  });

  it('honors a raw --anchor-* ident passed to [terseAnchored]', async () => {
    await render(`<div [terseAnchored]="'--anchor-custom'" aria-label="popover">P</div>`, {
      imports: IMPORTS,
    });

    expect(screen.getByLabelText('popover').style.getPropertyValue('position-anchor')).toBe(
      '--anchor-custom',
    );
  });

  it('honors an Anchor instance passed via template ref', async () => {
    @Component({
      selector: 'test-host',
      imports: IMPORTS,
      template: `
        <button #trigger="terseAnchor" aria-label="trigger" terseAnchor>T</button>
        <div aria-label="popover" [terseAnchored]="trigger">P</div>
      `,
    })
    class Host {
      readonly trigger = viewChild.required<Anchor>('trigger');
    }

    const {fixture} = await render(Host);
    const trigger = fixture.componentInstance.trigger();
    const popover = screen.getByLabelText('popover');

    expect(popover.style.getPropertyValue('position-anchor')).toBe(trigger.value);
    expect(popover.style.getPropertyValue('position-anchor')).toMatch(/^--anchor-\d+$/);
  });

  it('falls back to a parent Anchor through the DI tree', async () => {
    @Component({
      selector: 'test-host',
      imports: IMPORTS,
      template: `
        <div aria-label="trigger" terseAnchor>
          <div aria-label="popover" terseAnchored>P</div>
        </div>
      `,
    })
    class Host {}

    const {fixture} = await render(Host);
    fixture.detectChanges();

    const trigger = screen.getByLabelText('trigger');
    const popover = screen.getByLabelText('popover');
    const parentName = trigger.style.getPropertyValue('anchor-name');

    expect(parentName).toMatch(/^--anchor-\d+$/);
    expect(popover.style.getPropertyValue('position-anchor')).toBe(parentName);
  });

  it('resolves `positionAnchor()` to the ancestor Anchor instance value', async () => {
    @Directive({selector: '[parentAnchor]', hostDirectives: [TerseAnchor]})
    class ParentAnchor {
      readonly anchor = inject(Anchor);
    }

    @Directive({selector: '[childAnchored]', hostDirectives: [TerseAnchored]})
    class ChildAnchored {
      readonly anchored = inject(Anchored);
    }

    const {fixture} = await render(
      `<div parentAnchor>
         <div childAnchored aria-label="popover">P</div>
       </div>`,
      {imports: [ParentAnchor, ChildAnchored]},
    );

    const parent = fixture.debugElement.children[0].injector.get(ParentAnchor);
    const child = fixture.debugElement
      .query((d) => d.nativeElement.hasAttribute('childAnchored'))
      .injector.get(ChildAnchored);

    expect(child.anchored.positionAnchor()).toBe(parent.anchor.value);
    expect(screen.getByLabelText('popover').style.getPropertyValue('position-anchor')).toBe(
      parent.anchor.value,
    );
  });

  it('emits a null position-anchor and warns when no ancestor Anchor exists', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await render(`<div terseAnchored aria-label="popover">P</div>`, {imports: IMPORTS});

    expect(screen.getByLabelText('popover').style.getPropertyValue('position-anchor')).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No parent anchor found'));

    warnSpy.mockRestore();
  });

  it('sets a flipped margin on the opposite edge from `align`', async () => {
    await render(
      `<div terseAnchored terseAnchoredSide="top" terseAnchoredMargin="12px" aria-label="popover">P</div>`,
      {imports: IMPORTS},
    );
    const popover = screen.getByLabelText('popover');
    // align = top → margin applied to bottom (the FLIP_ALIGN pair).
    expect(popover.style.getPropertyValue('margin-bottom')).toBe('12px');
    expect(popover.style.getPropertyValue('margin-top')).toBe('');
  });

  it('joins custom positionTryFallbacks with commas', async () => {
    @Component({
      selector: 'test-host',
      imports: IMPORTS,
      template: `<div
        aria-label="popover"
        terseAnchored
        [terseAnchoredPositionTryFallbacks]="fallbacks"
      >
        P
      </div>`,
    })
    class Host {
      readonly fallbacks = ['flip-block', 'flip-inline'];
    }

    await render(Host);
    expect(screen.getByLabelText('popover').style.getPropertyValue('position-try-fallbacks')).toBe(
      'flip-block, flip-inline',
    );
  });

  it('accepts `absolute` for the position input', async () => {
    await render(
      `<div terseAnchored terseAnchoredPosition="absolute" aria-label="popover">P</div>`,
      {imports: IMPORTS},
    );
    expect(screen.getByLabelText('popover').style.getPropertyValue('position')).toBe('absolute');
  });
});
