// import {Component} from '@angular/core';
// import {TerseMenu, TerseMenuItem, TerseMenuTrigger} from '@terse-ui/core/menu';

// @Component({
//   selector: 'app-home',
//   imports: [TerseMenuTrigger, TerseMenu, TerseMenuItem],
//   host: {
//     'class': 'contents',
//   },
//   template: `
//     <div>
//       <button [terseMenuTrigger]="topTpl">Open Menu</button>
//       <ng-template #topTpl>
//         <div aria-label="Top" class="flex flex-col gap-2" terseMenu>
//           <button terseMenuItem (click)="console.log('cl Apple')">Apple</button>
//           <button disabled="soft" terseMenuItem (click)="console.log('cl Cherry')">Cherry</button>
//           <button disabled terseMenuItem (click)="console.log('cl Orange')">Orange</button>
//           <button terseMenuItem (click)="console.log('cl Banana')">Banana</button>
//           <button terseMenuItem [terseMenuTrigger]="subTpl">More</button>
//         </div>
//       </ng-template>
//       <ng-template #subTpl>
//         <div aria-label="More" class="flex flex-col gap-2" terseMenu>
//           <button terseMenuItem (click)="console.log('cl Sub One')">Sub One</button>
//           <button terseMenuItem (click)="console.log('cl Sub Two')">Sub Two</button>
//         </div>
//       </ng-template>
//     </div>
//   `,
// })
// export class Home {
//   console = console;
// }

import {Component} from '@angular/core';
import {Cn} from '@terse-ui/core';
import {TerseRovingFocus, TerseRovingFocusItem} from '@terse-ui/core/roving-focus';

@Component({
  selector: 'app-home',
  imports: [TerseRovingFocus, TerseRovingFocusItem, Cn],
  template: `
    <div
      class="flex flex-col items-start gap-2"
      cn
      orientation="vertical"
      role="menu"
      terseRovingFocus
    >
      <button terseRovingFocusItem>1</button>
      <div
        class="ml-4 flex flex-col items-start gap-2"
        cn
        orientation="vertical"
        role="menu"
        terseRovingFocus
        terseRovingFocusItem
      >
        <button terseRovingFocusItem>sub 1</button>
        <div
          class="ml-4 flex flex-col items-start gap-2"
          cn
          orientation="vertical"
          role="menu"
          terseRovingFocus
          terseRovingFocusItem
        >
          <button terseRovingFocusItem>sub 1</button>
          <button terseRovingFocusItem>sub 2</button>
          <button terseRovingFocusItem>sub 3</button>
          <button disabled="soft" terseRovingFocusItem>sub 4 (soft-disabled)</button>
          <button disabled="soft" terseRovingFocusItem>sub 5 (soft-disabled)</button>
          <button terseRovingFocusItem>sub 6</button>
          <button disabled terseRovingFocusItem>sub 7 (hard-disabled)</button>
          <button terseRovingFocusItem>sub 8</button>
        </div>
        <button terseRovingFocusItem>sub 3</button>
        <button disabled="soft" terseRovingFocusItem>sub 4 (soft-disabled)</button>
        <button disabled="soft" terseRovingFocusItem>sub 5 (soft-disabled)</button>
        <button terseRovingFocusItem>sub 6</button>
        <button disabled terseRovingFocusItem>sub 7 (hard-disabled)</button>
        <button terseRovingFocusItem>sub 8</button>
      </div>
      <button terseRovingFocusItem>3</button>
      <button disabled="soft" terseRovingFocusItem>4 (soft-disabled)</button>
      <button disabled="soft" terseRovingFocusItem>5 (soft-disabled)</button>
      <button terseRovingFocusItem>6</button>
      <button disabled terseRovingFocusItem>7 (hard-disabled)</button>
      <button terseRovingFocusItem>8</button>
    </div>
  `,
})
export class Home {}
