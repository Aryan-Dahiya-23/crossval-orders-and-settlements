'use client';

import * as React from 'react';
import { RiLogoutBoxRLine, RiUser3Line } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import type { Viewer } from '@crossval/contracts';

import { useLogout, useSession } from '../../features/auth/queries';
import { cn } from '@/utils/cn';
import * as Divider from '../ui/divider';
import * as Dropdown from '../ui/dropdown';
import { Skeleton } from '../ui/skeleton';

type UserButtonProps = {
  collapsed?: boolean | undefined;
  viewer?: Viewer | undefined;
  className?: string | undefined;
};

export function UserButton({
  collapsed = false,
  viewer: initialViewer,
  className,
}: UserButtonProps) {
  const router = useRouter();
  const { data: sessionViewer, isLoading } = useSession();
  const logoutMutation = useLogout();

  const user = sessionViewer ?? initialViewer;

  if (isLoading && !user) {
    return (
      <div
        className={cn(
          'flex items-center rounded-10 bg-bg-white-0',
          collapsed ? 'size-10 justify-center' : 'gap-3 p-2.5',
          className,
        )}
      >
        <Skeleton className="size-8 rounded-full" />
        {!collapsed && (
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initial = user.email.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/login');
  };

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        className={cn(
          'group flex w-full items-center rounded-10 bg-bg-white-0 text-left transition duration-150 ease-out cursor-pointer outline-none',
          'hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-stroke-strong-950',
          collapsed
            ? 'size-10 justify-center p-0'
            : 'gap-3 p-2 ring-1 ring-inset ring-stroke-soft-200 shadow-regular-xs hover:shadow-none',
          className,
        )}
        aria-label="User account menu"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
          {initial || <RiUser3Line className="size-3.5" />}
        </span>

        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-label-sm font-medium text-text-strong-950">
              {user.email.split('@')[0]}
            </span>
            <span className="block truncate text-paragraph-xs text-text-sub-600">
              {user.email}
            </span>
          </span>
        )}
      </Dropdown.Trigger>

      <Dropdown.Content
        side={collapsed ? 'right' : 'top'}
        sideOffset={12}
        align={collapsed ? 'start' : 'center'}
        className="w-56"
      >
        <div className="px-2.5 py-1.5">
          <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider">
            Signed in as
          </p>
          <p className="truncate text-label-sm font-medium text-text-strong-950">
            {user.email}
          </p>
        </div>

        <Divider.Root variant="line-spacing" />

        <Dropdown.Item
          className="text-error-base hover:bg-error-lighter/50 hover:text-error-dark focus:bg-error-lighter/50 focus:text-error-dark"
          onSelect={() => void handleLogout()}
          disabled={logoutMutation.isPending}
        >
          <Dropdown.ItemIcon as={RiLogoutBoxRLine} />
          <span>{logoutMutation.isPending ? 'Logging out…' : 'Sign out'}</span>
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

export default UserButton;
