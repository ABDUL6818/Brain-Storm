// apps/frontend/src/lib/navbar/transforms.ts

export interface NavLinkDescriptor {
  label: string;
  href: string;
  requiresAuth: boolean;
}

/**
 * Determines whether the given pathname matches the provided href.
 * A link is considered active when the pathname equals the href, or
 * when the pathname is a nested route of the href (excluding the root).
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (!pathname || !href) {
    return false;
  }

  // Normalize trailing slashes (except for root "/")
  const normalize = (value: string): string => {
    if (value.length > 1 && value.endsWith('/')) {
      return value.replace(/\/+$/, '');
    }
    return value;
  };

  const normalizedPath = normalize(pathname);
  const normalizedHref = normalize(href);

  if (normalizedHref === '/') {
    return normalizedPath === '/';
  }

  return (
    normalizedPath === normalizedHref ||
    normalizedPath.startsWith(`${normalizedHref}/`)
  );
}

/**
 * Returns the CSS class string to apply to a nav link based on whether
 * it is currently active.
 */
export function activeLinkClass(pathname: string, href: string): string {
  const base = 'nav-link';
  return isActivePath(pathname, href) ? `${base} nav-link--active` : base;
}

/**
 * Formats an unread count for display. Counts above 99 are capped at "99+".
 * Negative or invalid values are treated as zero.
 */
export function formatUnreadCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) {
    return '0';
  }

  const normalized = Math.floor(count);

  if (normalized > 99) {
    return '99+';
  }

  return String(normalized);
}

const PUBLIC_NAV_LINKS: NavLinkDescriptor[] = [
  { label: 'Home', href: '/', requiresAuth: false },
  { label: 'Explore', href: '/explore', requiresAuth: false },
];

const AUTHENTICATED_NAV_LINKS: NavLinkDescriptor[] = [
  { label: 'Dashboard', href: '/dashboard', requiresAuth: true },
  { label: 'Messages', href: '/messages', requiresAuth: true },
  { label: 'Profile', href: '/profile', requiresAuth: true },
];

/**
 * Builds the list of nav link descriptors for the current auth state.
 * Unauthenticated users only see public links; authenticated users see
 * public links plus their authenticated links.
 */
export function buildNavLinks(isAuthenticated: boolean): NavLinkDescriptor[] {
  if (!isAuthenticated) {
    return [...PUBLIC_NAV_LINKS];
  }

  return [...PUBLIC_NAV_LINKS, ...AUTHENTICATED_NAV_LINKS];
}