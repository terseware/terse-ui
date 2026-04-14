# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build all projects
pnpm build                  # nx run-many -t build

# Test all projects
pnpm test                   # nx run-many -t test

# Lint all projects (with autofix)
pnpm fix                    # nx run-many -t lint --fix

# Run E2E tests
pnpm e2e                    # npx nx e2e ui -- --project=chromium

# Single project commands
npx nx build ui
npx nx test ui
npx nx lint ui
npx nx serve web
npx nx serve examples

# Run a single test file
npx vitest run --config ./packages/ui/vite.config.mts  ./packages/ui/button/lib/button.spec.ts  # Single test file
```

Test runner is Vitest with `@analogjs/vitest-angular`. Tests use `@testing-library/angular` + `@testing-library/user-event`.

## Architecture

Nx monorepo (`pnpm` workspace) with Angular 21, TypeScript 6, and Vite.

### Packages

- **`packages/ui`** — Publishable Angular component library (`@terseware/ui`). Built with ng-packagr. Each subdirectory is a secondary entry point (e.g., `@terseware/ui/menu`, `@terseware/ui/button`).
- **`apps/web`** — SSR-enabled demo app consuming the library.
- **`apps/examples`** — Client-side demo showing wrapper directive composition patterns.

### UI Library Layering

The library follows a strict **atoms → primitives → composites** hierarchy:

**Atoms** (`packages/ui/atoms/`) — Single-purpose directives that control one host attribute or ARIA property. Each atom extends `Source<T>` and uses `linkedSignal()` to bridge inputs to reactive state. Examples: `AttrRole`, `AttrType`, `TabIndex`, `Disabler`, `OpenClose`, `KeyboardEvents`, `Classes`.

**Primitives** (`packages/ui/button/`, `anchor/`, etc.) — Behavioral directives that compose atoms via `hostDirectives`. Examples: `Activatable` composes `Disabler` + `TabIndex`; `Button` composes `Activatable` + `AttrRole` + `AttrType`.

**Composites** (`packages/ui/menu/`, `roving-focus/`, `focus-trap/`) — Full-featured components composed from primitives. Example: `MenuTrigger` composes `Button` + `Anchor` + `AriaHasPopup` + `OpenClose`.

### Host Directives (Composition Pattern)

`hostDirectives` are the primary composition mechanism. Angular **natively de-duplicates** host directives — if the same directive appears at multiple levels in a composition chain, only one instance is created. This means you can freely compose directives without worrying about duplicates.

**Prefer `hostDirectives`.** Prefer composition over inheritance. Each directive should do one thing and be composable via `hostDirectives`. Host directives can inject their host, their sibling host directives, and provide DI tokens. The host's bindings take precedence over host directive bindings.

### Sources (`packages/ui/sources/`)

Reactive value containers used by atoms and primitives:

- **`Source<T>`** — Writable signal wrapper with `set()`, `update()`, `control()`. Used by atoms for mutable state.
- **`Source<T>`** — Read-only signal wrapper (callable via Proxy). Used for computed-only values like `Anchor`.
- **`ConcatState<T, M>`** — Composable pre/post source arrays with abstract `merge()`. Used by `Classes` to stack CSS classes across composition layers.

### Options Pattern (`configBuilder`)

Hierarchical configuration via DI:

```typescript
const [provideMyOpts, injectMyOpts] = configBuilder<MyOpts>('Name', defaults, optionalMerger);
```

Returns a `[provider, injector]` tuple. Providers can be placed at any component level for hierarchical override. Supports deep merging and function-based (lazy) option values. Used by `Button`, `Identifier`, `Anchored`, etc.

### Key Utilities (`packages/ui/internal/`)

- **`injectElement()`** — Type-safe host element injection.
- **`HostAttributes`** — Reads static host attributes via `HostAttributeToken` with memoized caching. Also `@PerHost()`-enabled.
- **`deepMerge()`** — Recursive object merge with prototype pollution protection.
- **`unwrap()` / `unwrapInject()`** — Resolves `MaybeFn<T>` values (function or direct).

## Conventions

- **Selectors**: lowercase attribute selectors (`[button]`, `[menuItem]`, `[menuTrigger]`)
- **Export as**: matches attribute name (`exportAs: 'button'`)
- **Imports**: enforce `type` keyword for type-only imports/exports (`consistent-type-imports`, `consistent-type-exports`)
- **Signals over observables**: use Angular signals, `linkedSignal()`, `computed()`, `effect()` — not RxJS for component state
- **Standalone only**: all directives/components are standalone
- **Testing**: use `@testing-library/angular` `render()` + `screen` queries + `userEvent` for interactions

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
