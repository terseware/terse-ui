import {isPlatformBrowser} from '@angular/common';
import {inject, InjectionToken, PLATFORM_ID, REQUEST} from '@angular/core';

/**
 * True when running in a browser platform.
 *
 * @remarks
 * Platform-scoped: evaluated once per platform (per app in the browser, per
 * server process in SSR). Safe because the value is stable within a platform.
 */
export const IS_BROWSER = new InjectionToken<boolean>('IS_BROWSER', {
  providedIn: 'platform',
  factory: () => isPlatformBrowser(inject(PLATFORM_ID)),
});

/** True when running on the server. Derived from {@link IS_BROWSER}. */
export const IS_SERVER = new InjectionToken<boolean>('IS_SERVER', {
  providedIn: 'platform',
  factory: () => !inject(IS_BROWSER),
});

const MOBILE_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * True when the current user-agent appears to be a mobile device.
 */
export const IS_MOBILE = new InjectionToken<boolean>('IS_MOBILE', {
  providedIn: 'platform',
  factory: () => {
    if (inject(IS_BROWSER)) {
      const uaData = (navigator as {userAgentData?: {mobile?: boolean}}).userAgentData;
      if (uaData && typeof uaData.mobile === 'boolean') return uaData.mobile;
      return MOBILE_REGEX.test(navigator.userAgent);
    }
    const userAgent = inject(REQUEST, {optional: true})?.headers.get('user-agent');
    return userAgent ? MOBILE_REGEX.test(userAgent) : false;
  },
});
