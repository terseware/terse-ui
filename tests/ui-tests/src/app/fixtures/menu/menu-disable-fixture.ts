import {Component} from '@angular/core';
import {Menu, MenuItem, MenuTrigger} from '@terseware/ui/menu';

@Component({
  selector: 'test-menu-fixture',
  imports: [MenuTrigger, Menu, MenuItem],
  template: `
    <button menuTrigger [menuTriggerFor]="menuTpl">Menu Trigger</button>
    <ng-template #menuTpl>
      <div class="grid" menu>
        <button menuItem>Native Enabled</button>
        <button disabled menuItem>Native Hard Disabled</button>
        <button menuItem softDisabled>Native soft Disabled</button>
        <span menuItem>Non-Native Enabled</span>
        <span disabled menuItem>Non-Native Hard Disabled</span>
        <span menuItem softDisabled>Non-Native soft Disabled</span>
      </div>
    </ng-template>
  `,
})
export class TestMenuDisableFixture {}
