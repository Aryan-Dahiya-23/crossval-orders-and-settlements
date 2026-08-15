import {
  RiAddCircleLine,
  RiFileList3Line,
  type RemixiconComponentType,
} from '@remixicon/react';

export type NavigationItem = {
  href: string;
  label: string;
  icon: RemixiconComponentType;
};

export const primaryNavigation: readonly NavigationItem[] = [
  { href: '/orders', label: 'Orders & settlements', icon: RiFileList3Line },
  { href: '/orders/new', label: 'Create new order', icon: RiAddCircleLine },
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  if (href === '/orders') {
    return (
      pathname === '/orders' ||
      (pathname.startsWith('/orders/') && !pathname.startsWith('/orders/new'))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
