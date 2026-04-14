import {Component, Directive, inject} from '@angular/core';
import {Role} from '@terse-ui/core/attr';
import {TerseButton} from '@terse-ui/core/button';

@Directive({
  selector: '[appMenuItem]',
  hostDirectives: [TerseButton],
})
export class AppMenuItem {
  constructor() {
    inject(Role).append(({next}) => {
      const value = next();
      return value ?? 'menuitem';
    });
  }
}

@Component({
  selector: 'app-home',
  imports: [AppMenuItem],
  host: {
    'class': 'contents',
  },
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="p-4">
        <button appMenuItem (click)="console.log('click')">button</button>
      </div>
    </div>
  `,
})
export class Home {
  console = console;
}
