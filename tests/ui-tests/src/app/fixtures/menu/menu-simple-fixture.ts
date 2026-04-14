import {Component} from '@angular/core';
import {Menu, MenuItem, MenuTrigger} from '@terseware/ui/menu';

@Component({
  selector: 'test-menu-fixture',
  imports: [MenuTrigger, Menu, MenuItem],
  template: `
    <button menuTrigger [menuTriggerFor]="menuTpl">Menu Trigger</button>
    <ng-template #menuTpl>
      <div menu>
        <span menuItem>Menu Item 1</span>
        <button menuItem>Menu Item 2</button>
        <div menuItem>Menu Item 3</div>
        <button menuItem>Menu Item 4</button>
      </div>
    </ng-template>
  `,
  styles: `
    [menu] {
      display: grid;
    }
  `,
})
export class TestMenuSimpleFixture {}
