import {Component, Directive, inject, viewChild} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {expectNoA11yViolations} from '../../test-axe';
import {Discloser, Orientation, Role, Type} from './misc-states';

@Directive({
  selector: '[role]',
  hostDirectives: [{directive: Role, inputs: ['role']}],
})
class TestRole {}

@Directive({
  selector: '[type]',
  hostDirectives: [{directive: Type, inputs: ['type']}],
})
class TestType {}

@Directive({
  selector: '[orientation]',
  hostDirectives: [{directive: Orientation, inputs: ['orientation']}],
})
class TestOrientation {}

@Directive({
  selector: '[discloser]',
  hostDirectives: [{directive: Discloser, inputs: ['opened']}],
  exportAs: 'discloser',
})
class TestDiscloser {
  readonly d = inject(Discloser);
}

describe('Role atom', () => {
  it('renders the initial role from the host attribute', async () => {
    await render(`<div role="tab">x</div>`, {imports: [TestRole]});
    expect(screen.getByRole('tab')).toBeInTheDocument();
  });

  it('supports binding role via input', async () => {
    await render(`<div [role]="'menuitem'">x</div>`, {imports: [TestRole]});
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });

  it('updates when role input changes', async () => {
    const {rerender} = await render(`<div [role]="r" aria-label="x">x</div>`, {
      imports: [TestRole],
      componentProperties: {r: 'button'},
    });
    expect(screen.getByRole('button', {name: 'x'})).toBeInTheDocument();
    await rerender({componentProperties: {r: 'tab'}});
    expect(screen.getByRole('tab', {name: 'x'})).toBeInTheDocument();
  });
});

describe('Type atom', () => {
  it('reflects initial type attribute', async () => {
    await render(`<button type="submit">ok</button>`, {imports: [TestType]});
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('respects [type] input override', async () => {
    await render(`<button [type]="'reset'">ok</button>`, {imports: [TestType]});
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });

  it('updates the rendered type when input changes', async () => {
    const {rerender} = await render(`<button [type]="t">ok</button>`, {
      imports: [TestType],
      componentProperties: {t: 'button'},
    });
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'button');
    await rerender({componentProperties: {t: 'submit'}});
    expect(btn).toHaveAttribute('type', 'submit');
  });
});

describe('Orientation atom', () => {
  it('respects [orientation] input override', async () => {
    await render(
      `<div orientation role="toolbar" aria-label="t" [orientation]="'horizontal'">x</div>`,
      {imports: [TestOrientation]},
    );
    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('drops unknown orientation tokens (treated as null)', async () => {
    await render(
      `<div orientation role="toolbar" aria-label="t" [orientation]="'sideways'">x</div>`,
      {imports: [TestOrientation]},
    );
    expect(screen.getByRole('toolbar')).not.toHaveAttribute('aria-orientation');
  });

  it('swaps horizontal ↔ vertical reactively', async () => {
    const {rerender} = await render(
      `<div orientation role="toolbar" aria-label="t" [orientation]="o">x</div>`,
      {imports: [TestOrientation], componentProperties: {o: 'horizontal'}},
    );
    const tb = screen.getByRole('toolbar');
    expect(tb).toHaveAttribute('aria-orientation', 'horizontal');
    await rerender({componentProperties: {o: 'vertical'}});
    expect(tb).toHaveAttribute('aria-orientation', 'vertical');
  });
});

describe('Discloser atom', () => {
  it('reflects initial closed state', async () => {
    await render(`<button discloser>Toggle</button>`, {imports: [TestDiscloser]});
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('data-closed', '');
    expect(btn).not.toHaveAttribute('data-opened');
  });

  it('reflects initial open state via opened="true"', async () => {
    await render(`<button discloser opened>Toggle</button>`, {imports: [TestDiscloser]});
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(btn).toHaveAttribute('data-opened', '');
    expect(btn).not.toHaveAttribute('data-closed');
  });

  it('updates aria-expanded reactively via the opened input', async () => {
    const {rerender} = await render(`<button discloser [opened]="o">Toggle</button>`, {
      imports: [TestDiscloser],
      componentProperties: {o: false},
    });
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    await rerender({componentProperties: {o: true}});
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(btn).toHaveAttribute('data-opened', '');
    expect(btn).not.toHaveAttribute('data-closed');

    await rerender({componentProperties: {o: false}});
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('data-closed', '');
    expect(btn).not.toHaveAttribute('data-opened');
  });

  it('toggle() flips the state', async () => {
    @Component({
      selector: 'test-host',
      imports: [TestDiscloser],
      template: `<button #ref="discloser" discloser (click)="ref.d.toggle()">Toggle</button>`,
    })
    class Host {
      readonly ref = viewChild<TestDiscloser>('ref');
    }

    await render(Host);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(btn).toHaveAttribute('data-opened', '');

    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('data-closed', '');
  });

  it('set() explicitly updates the state', async () => {
    @Component({
      selector: 'test-host',
      imports: [TestDiscloser],
      template: `<button #ref="discloser" discloser>Toggle</button>`,
    })
    class Host {
      readonly ref = viewChild<TestDiscloser>('ref');
    }

    const {fixture} = await render(Host);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    fixture.componentInstance.ref()?.d.set(true);
    fixture.detectChanges();
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('no axe violations for closed and open disclosure', async () => {
    const {rerender, container} = await render(
      `<button discloser [opened]="o" aria-controls="p">Menu</button>
       <div id="p" [hidden]="!o">panel</div>`,
      {imports: [TestDiscloser], componentProperties: {o: false}},
    );
    await expectNoA11yViolations(container);

    await rerender({componentProperties: {o: true}});
    await expectNoA11yViolations(container);
  });
});
