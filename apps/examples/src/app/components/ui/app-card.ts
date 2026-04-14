import {Directive, inject, input} from '@angular/core';
import {TwClasses} from '@terseware/ui/atoms';

@Directive({
  selector: 'app-card, [appCard]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card',
    '[attr.data-size]': 'cardSize()',
  },
})
export class AppCard {
  readonly cardSize = input<'default' | 'sm'>('default');
  constructor() {
    inject(TwClasses).classes(() => [
      'group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
    ]);
  }
}

@Directive({
  selector: 'app-card-header, [appCardHeader]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card-header',
  },
})
export class AppCardHeader {
  constructor() {
    inject(TwClasses).classes(() => [
      'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4',
    ]);
  }
}

@Directive({
  selector: 'app-card-title, [appCardTitle]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card-title',
  },
})
export class AppCardTitle {
  constructor() {
    inject(TwClasses).classes(() => [
      'font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm',
    ]);
  }
}

@Directive({
  selector: 'app-card-description, [appCardDescription]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card-description',
  },
})
export class AppCardDescription {
  constructor() {
    inject(TwClasses).classes(() => ['text-sm text-muted-foreground']);
  }
}

@Directive({
  selector: 'app-card-action, [appCardAction]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card-action',
  },
})
export class AppCardAction {
  constructor() {
    inject(TwClasses).classes(() => [
      'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
    ]);
  }
}

@Directive({
  selector: 'app-card-content, [appCardContent]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card-content',
  },
})
export class AppCardContent {
  constructor() {
    inject(TwClasses).classes(() => ['px-6 group-data-[size=sm]/card:px-4']);
  }
}

@Directive({
  selector: 'app-card-footer, [appCardFooter]',
  hostDirectives: [
    {
      directive: TwClasses,
      inputs: ['class'],
    },
  ],
  host: {
    'data-slot': 'card-footer',
  },
})
export class AppCardFooter {
  constructor() {
    inject(TwClasses).classes(() => [
      'flex items-center rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4',
    ]);
  }
}
