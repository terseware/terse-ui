import {Component} from '@angular/core';
import {Menu, MenuItem, MenuTrigger} from '@terseware/ui/menu';

@Component({
  selector: 'test-menu-fixture',
  imports: [MenuTrigger, Menu, MenuItem],
  template: `
    <button menuTrigger [menuTriggerFor]="menuTpl">Menu Trigger</button>
    <ng-template #menuTpl>
      <div menu class="grid">
        <button menuItem>Native Enabled</button>
        <button menuItem disabled>Native Hard Disabled</button>
        <button menuItem softDisabled>Native soft Disabled</button>
        <span menuItem>Non-Native Enabled</span>
        <span menuItem disabled>Non-Native Hard Disabled</span>
        <span menuItem softDisabled>Non-Native soft Disabled</span>
      </div>
    </ng-template>
  `,
})
export class TestMenuDisableFixture {}
