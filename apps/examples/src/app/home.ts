import {Component} from '@angular/core';
import {TerseHoverable, TersePressable} from '@terse-ui/core';

@Component({
  selector: 'app-home',
  imports: [TersePressable, TerseHoverable],
  host: {
    'class': 'contents',
  },
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="p-4">
        <button tersePressable terseHoverable>Enabled</button>
      </div>
    </div>
  `,
})
export class Home {
  console = console;
}
