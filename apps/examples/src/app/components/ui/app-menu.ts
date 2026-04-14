import {booleanAttribute, Directive, inject, input} from '@angular/core';
import {TwClasses} from '@terseware/ui/atoms';
import {Button} from '@terseware/ui/button';
import {Menu, MenuItem, MenuTrigger} from '@terseware/ui/menu';

// -----------------------------------------------------------------------------
// Trigger + popup
// -----------------------------------------------------------------------------

@Directive({
  selector: 'app-menu-trigger, [appMenuTrigger]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
    {
      directive: MenuTrigger,
      inputs: ['menuTriggerFor:appMenuTrigger'],
    },
    Button,
  ],
})
export class AppMenuTrigger {}

@Directive({
  selector: 'app-menu, [appMenu]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
    Menu,
  ],
  host: {
    'data-slot': 'menu',
  },
})
export class AppMenu {
  constructor() {
    inject(TwClasses).classes(() => [
      'z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95',
    ]);
  }
}

// -----------------------------------------------------------------------------
// Item variants
// -----------------------------------------------------------------------------

@Directive({
  selector: 'app-menu-item, [appMenuItem]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
    MenuItem,
  ],
  host: {
    'data-slot': 'menu-item',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[attr.data-variant]': 'variant()',
  },
})
export class AppMenuItem {
  /** Shifts the item's content to align with items that have a leading icon. */
  readonly inset = input(false, {transform: booleanAttribute});
  /** Visual variant — `'destructive'` flips to error colors for dangerous actions. */
  readonly variant = input<'default' | 'destructive'>('default');

  constructor() {
    inject(TwClasses).classes(() => [
      "group/menu-item relative w-full flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
    ]);
  }
}
