import {Component} from '@angular/core';
import {TerseMenu, TerseMenuItem, TerseMenuTrigger} from '@terse-ui/core/menu';

@Component({
  selector: 'app-home',
  imports: [TerseMenuTrigger, TerseMenu, TerseMenuItem],
  host: {
    'class': 'contents',
  },
  template: `
    <div>
      <button [terseMenuTrigger]="topTpl">Open Menu</button>
      <ng-template #topTpl>
        <div aria-label="Top" class="flex flex-col gap-2" terseMenu>
          <button terseMenuItem>Apple</button>
          <button terseMenuItem [terseMenuTrigger]="subTpl">More</button>
          <button terseMenuItem>Cherry</button>
        </div>
      </ng-template>
      <ng-template #subTpl>
        <div aria-label="More" class="flex flex-col gap-2" terseMenu>
          <button terseMenuItem>Sub One</button>
          <button terseMenuItem>Sub Two</button>
        </div>
      </ng-template>
    </div>
  `,
})
export class Home {
  console = console;
}
