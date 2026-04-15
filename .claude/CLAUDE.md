# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

Do not touch git; no stashes, no commits; unless explicitly instructed to do so.

## Commands

```bash
# Build all projects
pnpm build                  # nx run-many -t build

# Test all projects
pnpm test                   # nx run-many -t test

# Lint all projects (with autofix)
pnpm fix                    # nx run-many -t lint --fix

# Run E2E tests
pnpm e2e                    # npx nx e2e terse-ui -- --project=chromium

# Single project commands
npx nx build terse-ui
npx nx test terse-ui --no-tui
npx nx lint terse-ui
npx nx serve web
npx nx serve examples

# Run a single test file
npx vitest run --config ./packages/terse-ui/vite.config.mts ./packages/terse-ui/button/lib/button.spec.ts
```

Test runner is Vitest with `@analogjs/vitest-angular`. Tests use `@testing-library/angular` + `@testing-library/user-event`.

## Architecture

Nx monorepo (`pnpm` workspace) with Angular 21, TypeScript 6, and Vite.

### Packages

- **`packages/terse-ui`** — Publishable Angular component library (`@terseware/ui`). Built with ng-packagr. Each subdirectory is a secondary entry point (e.g., `@terseware/ui/button`, `@terseware/ui/disabler`, `@terseware/ui/state`).
- **`apps/web`** — SSR-enabled demo app consuming the library.
- **`apps/examples`** — Client-side demo showing wrapper directive composition patterns.

### Library Layering

The library follows an **atoms → primitives → terse wrappers** hierarchy:

**Atoms** live under the attribute/event/state entry points — single-purpose directives/primitives that manage one concern:

- `packages/terse-ui/attributes/` — attribute directives (`TabIndex`, `RoleAttribute`, `TypeAttribute`, `DisabledAttribute`, `AriaDisabled`, `DataDisabled`/`DataFocus`/`DataHover`, `Orientation`, `IdAttribute`). Each exposes a `.value` `pipelineSignal` composing directives can pipe into.
- `packages/terse-ui/events/` — event pipeline directives (`OnKeyDown`, `OnClick`, `OnPointerDown`, …) extending `EventPipeline<E>`. Composing directives call `.pipe(...)` to intercept.
- `packages/terse-ui/state/` — reactive containers (`State<S,R>`, `pipelineSignal`, entity helpers).

**Primitives** (`packages/terse-ui/button/`, `packages/terse-ui/disabler/`, `packages/terse-ui/interactions/`, etc.) — behavioral directives that compose atoms via `hostDirectives`. They intentionally DO NOT forward inputs so downstream composers can freely alias. Examples: `Button`, `Disabler`, `Focus`, `Hover`, `RovingFocusItem`.

**Terse wrappers** (`TerseButton`, `TerseDisabler`, `TerseRovingFocus`, `TerseFocus`, `TerseHover`, …) — consumer-facing directives that forward atom inputs with a `terse*` alias. Each is a thin DI alias layer:

```typescript
@Directive({
  selector: '[terseButton]',
  exportAs: 'terseButton',
  hostDirectives: [
    Button,
    {directive: Disabler, inputs: ['disabled', 'disablerOptions:terseDisablerOptions']},
    {directive: TabIndex, inputs: ['tabIndex']},
    {directive: RoleAttribute, inputs: ['role']},
    {directive: TypeAttribute, inputs: ['type']},
  ],
})
export class TerseButton {
  constructor() {
    return inject(Button);
  }
}
```

**Rule: compose on primitives (`Button`), consume `TerseButton`.** Angular inputs can only be aliased once, so composing on a Terse wrapper collapses the whole point of the split.

### Host Directives (Composition Pattern)

`hostDirectives` are the primary composition mechanism. Angular **natively de-duplicates** host directives — if the same directive appears at multiple levels in a composition chain, only one instance is created. Compose freely without worrying about duplicates.

**Prefer `hostDirectives` over inheritance.** Each directive does one thing. Host directives can inject their host, their sibling host directives, and provide DI tokens. The host's bindings take precedence over host directive bindings.

### Pipeline Ordering

Both `pipelineSignal` and `EventPipeline` run handlers in **registration order — first piped runs first**. Since Angular constructs hostDirectives innermost-first, atoms register before outer composing directives.

The common pattern:

- **Inner (atom/primitive) handlers** register via default `.pipe(...)` and run first. They do their work then call `next()` to delegate to outer composers.
- **Outer composing directives that need to intercept _before_ inner** should use `.pipe(handler, {prepend: true})`. This is the canonical wrap pattern — e.g., a roving-focus item that must handle Arrow keys even when the inner button is disabled must prepend.

### State Primitives (`packages/terse-ui/state/`)

- **`State<S, R = S>`** — Base class with a writable inner signal and a derived public `state` deep-signal. Subclass for reactive containers (`Focus`, `Hover`).
- **`pipelineSignal(source, opts?)`** — Function-based middleware pipeline backing a read-only signal. Handlers pipe in via `.pipe()` and can `next()`, `haltPipeline()`, or short-circuit. Use `pipelineSignal.deep()` when the public shape is an object. This replaced the old `StatePipeline` inheritance model.
- Entity helpers (`addEntity`, `removeEntity`, `updateEntity`, …) for collection state.

### Options Pattern (`configBuilder`)

Hierarchical configuration via DI:

```typescript
const [provideMyOpts, injectMyOpts] = configBuilder<MyOpts>('Name', defaults, optionalMerger);
```

Returns a `[provider, injector]` tuple. Providers can be placed at any component level for hierarchical override. Supports deep merging and function-based (lazy) option values.

### Key Utilities (`packages/terse-ui/utils/`)

- **`injectElement()`** — Type-safe host element injection.
- **`deepMerge()`** — Recursive object merge with prototype pollution protection.
- **`unwrap()` / `unwrapInject()`** — Resolves `MaybeFn<T>` values.
- **`toDeepSignal()`** — Wraps a signal as a `DeepSignal` for nested reactive access.
- Signal validators, id generators, timeout helpers.

## Conventions

- **Selectors**: lowercase attribute selectors for primitives (`[button]`, `[disabler]`); `terse`-prefixed camelCase for consumer wrappers (`[terseButton]`, `[terseRovingFocus]`).
- **Export as**: matches the attribute name (`exportAs: 'button'`, `exportAs: 'terseButton'`).
- **Terse wrapper forwarding**: prefix shared input aliases with `terse` when they would collide with natural HTML attributes (`disablerOptions:terseDisablerOptions`); leave unprefixed when the input name is unambiguous (`tabIndex`, `role`).
- **Imports**: enforce `type` keyword for type-only imports/exports (`consistent-type-imports`, `consistent-type-exports`).
- **Signals over observables**: use Angular signals, `linkedSignal()`, `computed()`, `effect()` — not RxJS for component state.
- **Standalone only**: all directives/components are standalone.
- **Testing**: `@testing-library/angular` `render()` + `screen` queries + `userEvent`.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
