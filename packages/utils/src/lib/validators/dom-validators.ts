/**
 * Type guard for `Element`. Uses `instanceof` for consistency with the other DOM guards.
 */
export function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

/**
 * Cross-realm-safe variant of {@link isElement}. Checks the element's own
 * document's `Element` constructor, so elements from iframes pass.
 */
export function isElementCrossRealm(value: unknown): value is Element {
  if (!value || typeof value !== 'object') return false;
  const node = value as Node;
  const ctor = node.ownerDocument?.defaultView?.Element;
  return ctor ? node instanceof ctor : node instanceof Element;
}

/** Type guard for `HTMLElement`. Not cross-realm safe. */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

/** Type guard for `<button>` elements, optionally filtered by `type` attribute. */
export function isButtonElement<E extends Element>(
  element: E,
  {types}: {types?: readonly string[]} = {},
): element is E & HTMLButtonElement {
  if (!(element instanceof HTMLButtonElement)) return false;
  return !types?.length || types.includes(element.type);
}

/** Type guard for `<input>` elements, optionally filtered by `type` attribute. */
export function isInputElement<E extends Element>(
  element: E,
  {types}: {types?: readonly string[]} = {},
): element is E & HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) return false;
  return !types?.length || types.includes(element.type);
}

/**
 * Type guard for `<a>` elements.
 */
export function isAnchorElement<E extends Element>(element: E): element is E & HTMLAnchorElement {
  return element instanceof HTMLAnchorElement;
}

/**
 * Type guard for `<a>` elements that have a valid `href` or `routerLink` attribute.
 */
export function isValidLink<E extends Element>(element: E): element is E & HTMLAnchorElement {
  return (
    isAnchorElement(element) &&
    (!!element.getAttribute('href') || !!element.getAttribute('routerLink'))
  );
}

/**
 * Elements whose primary interaction is text input — inputs, textareas, and
 * `[contenteditable]` hosts, plus ARIA textbox/searchbox roles.
 */
export function isTypeableElement(
  value: unknown,
  {includeReadonly = false}: {includeReadonly?: boolean} = {},
): value is HTMLElement {
  if (!(value instanceof Element)) return false;
  const selector = includeReadonly ? TYPEABLE_SELECTOR_ALL : TYPEABLE_SELECTOR;
  return value.matches(selector);
}

const TYPEABLE_BASE =
  "input:not([type='hidden']):not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([disabled])," +
  'textarea:not([disabled]),' +
  "[contenteditable]:not([contenteditable='false'])," +
  "[role='textbox']:not([aria-disabled='true'])," +
  "[role='searchbox']:not([aria-disabled='true'])";

const TYPEABLE_SELECTOR = TYPEABLE_BASE.replace(/,/g, ':not([readonly]),') + ':not([readonly])';
const TYPEABLE_SELECTOR_ALL = TYPEABLE_BASE;

/**
 * Type guard for elements that natively support the `disabled` property.
 */
export function supportsDisabled<E extends Element>(
  element: E,
): element is E & {disabled: boolean} {
  return (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLFieldSetElement ||
    element instanceof HTMLOptionElement ||
    element instanceof HTMLOptGroupElement
  );
}

/** Type guard for elements that natively support the `required` property. */
export function supportsRequired<E extends Element>(
  element: E,
): element is E & {required: boolean} {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

/** Type guard for `EventTarget`. */
export function isEventTarget(value: unknown): value is EventTarget {
  return value instanceof EventTarget;
}

/**
 * Checks whether an element is effectively disabled — either via the native
 * `disabled` property or `aria-disabled="true"`. Covers both real form controls
 * and ARIA-composite widgets.
 */
export function isEffectivelyDisabled(element: Element): boolean {
  if (supportsDisabled(element) && element.disabled) return true;
  return element.getAttribute('aria-disabled') === 'true';
}

/**
 * Roles where Space is consumed by typeahead (not activation) when the host
 * has already called `preventDefault` on the keydown. Composite items in
 * these roles should skip activation if the event is already defaultPrevented.
 *
 * Matches `menuitem`, `menuitemradio`, `menuitemcheckbox`, `option`, `gridcell`.
 */
export function isTextNavigationRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === 'option' || role === 'gridcell' || role.startsWith('menuitem');
}

/** Roles that behave like a button for activation (Enter/Space). */
export function isButtonLikeRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (
    role === 'button' ||
    role === 'link' ||
    role === 'menuitem' ||
    role === 'menuitemcheckbox' ||
    role === 'menuitemradio' ||
    role === 'tab' ||
    role === 'option' ||
    role === 'switch' ||
    role === 'checkbox' ||
    role === 'radio'
  );
}

/**
 * Roles that can appear inside a composite widget as focusable items.
 * Useful for roving-tabindex logic.
 */
export function isCompositeItemRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (
    role === 'option' ||
    role === 'menuitem' ||
    role === 'menuitemcheckbox' ||
    role === 'menuitemradio' ||
    role === 'tab' ||
    role === 'treeitem' ||
    role === 'gridcell' ||
    role === 'row'
  );
}

export function assertEventTarget(value: unknown, source: string): asserts value is EventTarget {
  if (!isEventTarget(value)) {
    throw new Error(
      `[${source}] Expected an EventTarget, ElementRef but received: ${
        (value as object).constructor?.name ?? typeof value
      }. ` +
        `If you are using viewChild/contentChild, specify "{ read: ElementRef }" to avoid implicit directive references.`,
    );
  }
}
