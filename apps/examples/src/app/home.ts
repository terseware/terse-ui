import {Component, Directive} from '@angular/core';
import {TerseButton} from '@terse-ui/core/button';
import {TerseRovingFocus, TerseRovingFocusItem} from '@terse-ui/core/roving-focus';

@Directive({
  selector: '[appMenuItem]',
  hostDirectives: [TerseButton],
})
export class AppMenuItem {}

@Component({
  selector: 'app-home',
  imports: [TerseRovingFocus, TerseRovingFocusItem],
  host: {
    'class': 'contents',
  },
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="p-4">
        <div
          terseRovingFocus
          role="toolbar"
          aria-label="actions"
          orientation="vertical"
          class="flex flex-col gap-2"
        >
          <button terseRovingFocusItem>Enabled</button>
          <button terseRovingFocusItem aria-label="Hard disabled">HD</button>
          <button terseRovingFocusItem softDisabled aria-label="Soft disabled">SD</button>
        </div>
      </div>
    </div>
  `,
})
export class Home {
  console = console;
}
