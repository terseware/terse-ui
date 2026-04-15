import {Component} from '@angular/core';
import {TerseButton} from '@terse-ui/core/button';

@Component({
  selector: 'app-home',
  imports: [TerseButton],
  host: {
    'class': 'contents',
  },
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="p-4">
        <span terseButton composite (click)="console.log('click')"> Enabled </span>
      </div>
    </div>
  `,
})
export class Home {
  console = console;
}
