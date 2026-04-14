import {Component} from '@angular/core';
import {Menu, MenuItem, MenuTrigger} from '@terseware/ui/menu';

/**
 * Two-level nested menu fixture modeled after Angular Material's animal
 * taxonomy example. Exercises the recursive `MenuTrigger` — the same
 * directive powers both the top-level trigger button and the submenu-
 * trigger menu items, with submenu behavior activated via DI context
 * detection (presence of a parent `Menu` in the element injector tree).
 */
@Component({
  selector: 'test-menu-nested-fixture',
  imports: [MenuTrigger, Menu, MenuItem],
  template: `
    <button menuTrigger [menuTriggerFor]="animals">Animal Index</button>

    <ng-template #animals>
      <div menu>
        <button menuItem menuTrigger [menuTriggerFor]="vertebrates">Vertebrates</button>
        <button menuItem menuTrigger [menuTriggerFor]="invertebrates">Invertebrates</button>
      </div>
    </ng-template>

    <ng-template #vertebrates>
      <div menu side="right span-bottom">
        <button menuItem>Fish</button>
        <button menuItem>Amphibians</button>
        <button menuItem>Reptiles</button>
        <button menuItem>Birds</button>
        <button menuItem>Mammals</button>
      </div>
    </ng-template>

    <ng-template #invertebrates>
      <div menu side="right span-bottom">
        <button menuItem>Insects</button>
        <button menuItem>Molluscs</button>
        <button menuItem>Crustaceans</button>
      </div>
    </ng-template>
  `,
  styles: `
    [menu] {
      display: grid;
    }
  `,
})
export class TestMenuNestedFixture {}
