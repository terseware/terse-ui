import {computed, Directive, inject, input, output} from '@angular/core';
import {watcher} from '@signality/core';
import {
  configBuilder,
  hostAttr,
  IdGenerator,
  injectElement,
  isNil,
  statePipeline,
  supportsDisabled,
  type StatePipelineInterceptOptions,
} from '@terse-ui/utils';

export type BaseStyles = Record<string, string | number | boolean | null | undefined>;

export interface BaseConfig {
  inheritDisabled: boolean;
}

const [provideBaseConfig, injectBaseConfig] = configBuilder<BaseConfig>('Base', {
  inheritDisabled: false,
});

export {provideBaseConfig};

@Directive({
  host: {
    '[attr.id]': 'id',
    '[attr.role]': 'role()',
    '[attr.type]': 'type()',
    '[attr.disabled]': 'disabledAttr()',
    '[attr.aria-disabled]': 'ariaDisabledAttr()',
    '[attr.data-disabled]': 'disabledVariant()',
    '[style]': 'styles()',
  },
})
export class Base {
  readonly #element = injectElement();
  readonly #config = injectBaseConfig();
  readonly parent = inject(Base, {optional: true, skipSelf: true});

  readonly id = inject(IdGenerator).generate('terse');

  readonly roleInput = input(hostAttr('role'), {alias: 'role'});
  readonly role = statePipeline(this.roleInput);

  readonly typeInput = input(hostAttr('type'), {alias: 'type'});
  readonly type = statePipeline(this.typeInput);

  readonly nativeDisable = supportsDisabled(this.#element);
  readonly #initDisabled: boolean | 'soft' = this.#config.inheritDisabled
    ? (this.parent?.disabled() ?? false)
    : false;

  readonly disabledInput = input(this.#initDisabled, {
    alias: 'disabled',
    transform: this.#transformDisabled.bind(this),
  });
  readonly disabled = statePipeline(this.disabledInput);
  readonly disabledChange = output<boolean | 'soft'>();

  readonly softDisabled = computed(() => this.disabled() === 'soft');
  readonly hardDisabled = computed(() => this.disabled() === true);
  readonly disabledVariant = computed(() => {
    if (this.softDisabled()) return 'soft';
    if (this.hardDisabled()) return 'hard';
    return null;
  });

  protected readonly disabledAttr = computed(() =>
    this.nativeDisable && this.hardDisabled() ? '' : null,
  );

  protected readonly ariaDisabledAttr = computed(() =>
    (this.nativeDisable && this.softDisabled()) || (!this.nativeDisable && this.disabled())
      ? String(!!this.disabled())
      : null,
  );

  readonly #styles = statePipeline<BaseStyles>({});
  readonly styles = this.#styles.asReadonly();
  patchStyles(
    patch: (incoming: BaseStyles) => Partial<BaseStyles>,
    opts?: StatePipelineInterceptOptions,
  ): () => void {
    return this.#styles.intercept(({next}) => {
      const nextValue = next();
      return {...nextValue, ...patch(nextValue)};
    }, opts);
  }

  constructor() {
    watcher(this.disabled, (disabled) => this.disabledChange.emit(disabled));
  }

  #transformDisabled(
    v: boolean | '' | 'hard' | 'soft' | 'true' | 'false' | null | undefined,
  ): boolean | 'soft' {
    if (isNil(v)) return this.#initDisabled;
    if (typeof v === 'boolean') return v;
    if (v === 'soft') return 'soft';
    if (v === 'true' || v === 'hard' || v === '') return true;
    return false;
  }
}
