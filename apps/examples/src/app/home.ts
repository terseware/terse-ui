import {Component} from '@angular/core';
import {Cn} from '@terse-ui/core';

@Component({
  selector: 'app-home',
  imports: [Cn],
  host: {
    'class': 'contents',
  },
  template: `
    <div>
      <button class="de" cn="bg-red-500">s</button>
    </div>
  `,
})
export class Home {
  console = console;
}
