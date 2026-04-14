Big planning session. New Nx package in this repo called`@terseware/forge`. It's a `@terseware/ui` styling and composition tool. Cli like shadcn fully integrated with Angular 22 and its host directive composition.

```bash
npx terse forge init
# cli init options like shadcn or similar ...
```

You want a button?

```bash
npx terse forge add button --inputs hardDisable:disabled --prefix app
```

You get this in the directory from the generated terse.json from init

```ts
@Directive({
  selector: '[appButton]',
  hostDirectives: [
    Button,
    {
      directive: HardDisabled,
      inputs: ['hardDisabled:disabled'], // naive button behavior on any element
    },
  ],
})
export class AppButton {}
```

You want a native button with a sumbit template for forms?

```bash
npx terse forge add button --template native-sumbit --prefix appSubmit
```

```ts
@Component({
  selector: 'button[appSubmitButton]',
  hostDirectives: [
    {
      directive: SoftDisabled,
      inputs: ['softDisabled:submitting'],
    },
    Button,
  ],
  host: {
    '[aria-label]': 'isSubmitting() ? "Submitting, please wait" : null',
  },
  template: `
    @if (isSubmitting()) {
      <span>Submitting...</span>
    } @else {
      <span>Submit</span>
    }
  `,
})
export class AppSubmitButton {
  readonly isSubmitting = inject(SoftDisabled).asReadonly();

  constructor() {
    inject(AttrType).set('submit');
  }
}
```

Then I also want to do a 1:1 shadcn as well with styles where the design is is called 'terse'.

This is how the Button would look like when you generate it:

```bash
npx terse forge add button --preset terse
```

```ts
const terseButtonVariants = cva(
  'group/button focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0 [&_ng-icon:not(--ng-icon__size)]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-input/30 dark:bg-transparent',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: 'h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_ng-icon:not(--ng-icon__size)]:size-3',
        sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: 'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-9',
        'icon-xs': 'size-6 [&_ng-icon:not(--ng-icon__size)]:size-3',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type TerseButtonVariants = VariantProps<typeof terseButtonVariants>;

@Component({
  selector: 'terse-button, [button]',
  hostDirectives: [
    {
      directive: TabIndex,
      inputs: ['tabIndex'],
    },
    {
      directive: HardDisabled,
      inputs: ['hardDisabled:disabled'],
    },
    {
      directive: SoftDisabled,
      inputs: ['softDisabled:loading'],
    },
    {
      directive: AttrRole,
      inputs: ['role'],
    },
    {
      directive: AttrType,
      inputs: ['type'],
    },
    {
      directive: TwClasses,
      inputs: ['class'],
    },
    Button,
  ],
  host: {
    'data-slot': 'button',
    '[aria-label]': "isLoading() ? 'Loading, please wait' : null",
  },
  viewProviders: [provideIcons({lucideLoaderCircle})],
  template: `
    @if (isLoading()) {
      <ng-icon class="animate-spin" name="lucideLoaderCircle" />
    }
    <ng-content />
  `,
})
export class Button {
  readonly isLoading = inject(SoftDisabled).asReadonly();
  readonly button = input<TerseButtonVariants['variant'] | ''>();
  readonly size = input<TerseButtonVariants['size']>();
}
```

<tasks>
Do heavy research on the shadcn ecosystem using context7 and ref and see lessons learned from doing something like this.
(local shadcn at @/home/jomby/forks/shadcn/ui/ )
Research zard which is an Angular shadcn-like repo https://zardui.com/ locally too: @/home/jomby/angular-ecosystem/libs/zardui/

I would like a fluent build system using nx so use the nx-mcp to see how to translate the shadcn build system and see if someone else tried to do it.
</tasks>
