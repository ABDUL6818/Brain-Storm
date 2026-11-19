'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useNavbar } from './Navbar/useNavbar';
import { NavLinks } from './Navbar/NavLinks';
import { UserMenu } from './Navbar/UserMenu';
import { NotificationBell } from './Navbar/NotificationBell';
import { MobileMenu } from './Navbar/MobileMenu';
import { MobileMenuButton } from './Navbar/MobileMenuButton';

const WalletButton = dynamic(
  () => import('@/components/wallet/WalletButton').then((m) => ({ default: m.WalletButton })),
  {
    ssr: false,
    loading: () => (
      <div className="w-28 h-9 rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700" />
    ),
  }
);

// New file: apps/frontend/src/lib/navbar/transforms.ts
// (created as part of this refactor; content below is the utility module)

export interface NavLinkDefinition {
  href: string;
  label: string;
  requiresAuth: boolean;
}

export const NAV_LINK_DEFINITIONS: NavLinkDefinition[] = [
  { href: '/courses', label: 'Courses', requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { href: '/leaderboard', label: 'Leaderboard', requiresAuth: false },
  { href: '/cohorts', label: 'Cohorts', requiresAuth: true },
];

export const ACTIVE_LINK_CLASS = 'text-blue-600 dark:text-blue-400 font-semibold';
export const INACTIVE_LINK_CLASS =
  'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white';

export function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.endsWith(href);
}

export function getLinkClassName(pathname: string, href: string): string {
  return isLinkActive(pathname, href) ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS;
}

export function getAriaCurrent(pathname: string, href: string): 'page' | undefined {
  return pathname.endsWith(href) ? 'page' : undefined;
}

export function formatUnreadBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function getNotificationAriaLabel(unreadCount: number): string {
  return `Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`;
}

export function getVisibleNavLinks(isAuthenticated: boolean): NavLinkDefinition[] {
  return NAV_LINK_DEFINITIONS.filter((link) => !link.requiresAuth || isAuthenticated);
}
    user,
    isAuthenticated,
    logout,
    unreadCount,
    clearUnread,
    menuOpen,
    toggleMenu,
    closeMenu,
    dropdownOpen,
    toggleDropdown,
    closeDropdown,
    isActive,
  } = useNavbar();

  // NOTE: The following files are added by this refactor (see below):
  // - apps/frontend/src/components/layout/Navbar/useNavbar.ts
  // - apps/frontend/src/components/layout/Navbar/NavLinks.tsx
  // - apps/frontend/src/components/layout/Navbar/UserMenu.tsx
  // - apps/frontend/src/components/layout/Navbar/NotificationBell.tsx
  // - apps/frontend/src/components/layout/Navbar/MobileMenu.tsx
  // - apps/frontend/src/components/layout/Navbar/MobileMenuButton.tsx
  // - apps/frontend/src/lib/navbar/transforms.ts
  // - apps/frontend/src/components/layout/Navbar/__tests__/*.test.tsx

  return (
    <nav
      aria-label="Site navigation"
      className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors relative z-40"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg text-gray-900 dark:text-white">
          Brain-Storm
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          <NavLinks
            pathname={pathname}
            isAuthenticated={isAuthenticated}
            isActive={isActive}
            onNavigate={closeMenu}
          />
          <LanguageSwitcher />
          <ThemeToggle />
          <WalletButton />
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <NotificationBell unreadCount={unreadCount} onOpen={clearUnread} />
              <UserMenu
                user={user}
                dropdownOpen={dropdownOpen}
                onToggle={toggleDropdown}
                onClose={closeDropdown}
                onLogout={logout}
              />
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <MobileMenuButton menuOpen={menuOpen} onToggle={toggleMenu} />
      </div>

      {/* Mobile menu */}
      <MobileMenu
        open={menuOpen}
        pathname={pathname}
        isAuthenticated={isAuthenticated}
        isActive={isActive}
        onNavigate={closeMenu}
        onLogout={logout}
      />
    </nav>
  );
}
