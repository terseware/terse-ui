import {Component, Directive, inject, viewChild} from '@angular/core';
import {render} from '@testing-library/angular';
import {expectNoA11yViolations} from '../../test-axe';
import {Identifier, provideIdentifierOpts} from './identifier';

@Directive({
  selector: '[terseIdent]',
  hostDirectives: [Identifier],
  exportAs: 'terseIdent',
})
class TerseIdent {
  readonly id = inject(Identifier);
}

describe('Identifier atom', () => {
  describe('default prefix', () => {
    it('generates a unique id with the default "terse-" prefix', async () => {
      const {container} = await render(`<div terseIdent data-testid="a">x</div>`, {
        imports: [TerseIdent],
      });
      const el = container.querySelector('[data-testid="a"]') as HTMLElement;
      expect(el.id).toMatch(/^terse-\d+$/);
    });

    it('generates distinct ids for multiple instances', async () => {
      const {container} = await render(
        `<div terseIdent data-testid="a">x</div>
         <div terseIdent data-testid="b">x</div>`,
        {imports: [TerseIdent]},
      );
      const a = container.querySelector('[data-testid="a"]') as HTMLElement;
      const b = container.querySelector('[data-testid="b"]') as HTMLElement;
      expect(a.id).not.toBe(b.id);
      expect(a.id).toMatch(/^terse-\d+$/);
      expect(b.id).toMatch(/^terse-\d+$/);
    });
  });

  describe('provideIdentifierOpts', () => {
    it('lets a consumer override the prefix at the component level', async () => {
      @Component({
        selector: 'test-host',
        imports: [TerseIdent],
        providers: [provideIdentifierOpts({prefix: 'menu-item'})],
        template: `<div data-testid="a" terseIdent>x</div>`,
      })
      class Host {}

      const {container} = await render(Host);
      const el = container.querySelector('[data-testid="a"]') as HTMLElement;
      expect(el.id).toMatch(/^menu-item-\d+$/);
    });
  });

  describe('setPrefix', () => {
    it('updates the rendered id when setPrefix is called', async () => {
      @Component({
        selector: 'test-host',
        imports: [TerseIdent],
        template: `<div #d="terseIdent" data-testid="a" terseIdent>x</div>`,
      })
      class Host {
        readonly d = viewChild<TerseIdent>('d');
      }

      const {fixture, container} = await render(Host);
      const el = container.querySelector('[data-testid="a"]') as HTMLElement;
      const before = el.id;
      expect(before).toMatch(/^terse-\d+$/);

      fixture.componentInstance.d()?.id.setPrefix('tab');
      fixture.detectChanges();

      expect(el.id).toMatch(/^tab-\d+$/);
      expect(el.id).not.toBe(before);
    });
  });

  describe('a11y', () => {
    it('generated id can be referenced via aria-labelledby without axe violations', async () => {
      const {container} = await render(
        `<h2 terseIdent #t="terseIdent" data-testid="t">Title</h2>
         <section [attr.aria-labelledby]="t.id()">body</section>`,
        {imports: [TerseIdent]},
      );
      await expectNoA11yViolations(container);
    });
  });
});
