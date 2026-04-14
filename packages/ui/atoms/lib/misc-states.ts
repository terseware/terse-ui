import {booleanAttribute, Directive, input, linkedSignal} from '@angular/core';
import {hostAttr, type UnSet} from '@terseware/ui/internal';
import {override, State} from '@terseware/ui/state';
import {AriaExpanded, DataClosed, DataOpened} from './attr';

@Directive({
  exportAs: 'role',
  host: {
    '[attr.role]': 'value()',
  },
})
export class Role extends State<string | null> {
  readonly role = input(hostAttr('role'));
  constructor() {
    super(linkedSignal(() => this.role()));
  }
}

@Directive({
  exportAs: 'type',
  host: {
    '[attr.type]': 'value()',
  },
})
export class Type extends State<string | null> {
  readonly type = input(hostAttr('type'));
  constructor() {
    super(linkedSignal(() => this.type()));
  }
}

const oritentationSet = new Set(['horizontal', 'vertical'] as const);
export type OrientationValue = UnSet<typeof oritentationSet> | null;

@Directive({
  exportAs: 'orientation',
  host: {
    '[attr.aria-orientation]': 'value()',
  },
})
export class Orientation extends State<OrientationValue> {
  readonly orientation = input(hostAttr('aria-orientation') as OrientationValue);
  constructor() {
    super(
      linkedSignal(() => this.orientation()),
      (s) => (s && oritentationSet.has(s) ? s : null),
    );
  }
}

@Directive({
  exportAs: 'discloser',
  hostDirectives: [DataOpened, DataClosed, AriaExpanded],
})
export class Discloser extends State<boolean> {
  override readonly set = super.set.bind(this);
  readonly toggle = () => super.update((u) => !u);
  readonly opened = input(false, {transform: booleanAttribute});
  constructor() {
    super(linkedSignal(() => this.opened()));
    override(DataOpened, () => (this.value() ? '' : null));
    override(DataClosed, () => (!this.value() ? '' : null));
    override(AriaExpanded, () => String(this.value()));
  }
}
