'use client';

import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiMenu3Line,
} from '@remixicon/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Viewer } from '@crossval/contracts';

import { cn } from '@/utils/cn';
import * as CompactButton from '../ui/compact-button';
import * as Divider from '../ui/divider';
import * as Dialog from '@radix-ui/react-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Brand } from './brand';
import { isNavigationItemActive, primaryNavigation } from './navigation';
import { UserButton } from './user-button';

export { Brand } from './brand';

function NavigationLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {primaryNavigation.map(({ href, icon: Icon, label }) => {
        const active = isNavigationItemActive(pathname, href);
        const link = (
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            {...(collapsed ? { 'aria-label': label } : {})}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className={cn(
              'group relative flex h-10 items-center gap-3 rounded-lg text-label-sm text-text-sub-600',
              'transition duration-200 ease-out hover:bg-bg-weak-50 hover:text-text-strong-950',
              'focus-visible:shadow-button-important-focus focus-visible:outline-none',
              active && 'bg-bg-weak-50 text-text-strong-950 font-medium',
              collapsed ? 'w-10 justify-center' : 'w-full px-3',
            )}
          >
            <span
              className={cn(
                'absolute -left-5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-base transition-transform duration-200',
                active ? 'scale-y-100' : 'scale-y-0',
              )}
              aria-hidden="true"
            />
            <Icon
              className={cn(
                'size-5 shrink-0 text-text-sub-600 transition-colors',
                active && 'text-primary-base',
              )}
              aria-hidden="true"
            />
            {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
            {!collapsed && active && (
              <RiArrowRightSLine
                className="size-4 shrink-0 text-text-sub-600"
                aria-hidden="true"
              />
            )}
          </Link>
        );

        if (!collapsed) return <div key={href}>{link}</div>;

        return (
          <Tooltip key={href} delayDuration={250}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function Sidebar({
  collapsed,
  viewer,
  onToggle,
}: {
  collapsed: boolean;
  viewer?: Viewer | undefined;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-stroke-soft-200 bg-bg-white-0 transition-all duration-300 ease-out lg:flex',
        collapsed ? 'w-[82px]' : 'w-[272px]',
      )}
    >
      <div className="flex h-[68px] shrink-0 items-center px-5">
        <Brand collapsed={collapsed} />
      </div>

      <div className="px-5">
        <Divider.Root className="transition-all duration-300" />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden py-5 px-5">
        {!collapsed && (
          <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
            Workspace
          </p>
        )}
        <NavigationLinks collapsed={collapsed} />

        <div className="mt-auto space-y-3 pt-6">
          <Divider.Root className="transition-all duration-300" />
          <UserButton collapsed={collapsed} viewer={viewer} />
        </div>
      </div>

      <Tooltip delayDuration={250}>
        <TooltipTrigger asChild>
          <CompactButton.Root
            variant="stroke"
            size="large"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(
              'absolute top-[18px] z-50 bg-bg-white-0 shadow-regular-xs transition-all duration-300 hover:bg-bg-weak-50',
              collapsed ? '-right-3.5' : 'right-4',
            )}
          >
            <CompactButton.Icon
              as={RiArrowLeftSLine}
              className={cn(
                'size-5 transition-transform duration-200',
                collapsed && 'rotate-180',
              )}
            />
          </CompactButton.Root>
        </TooltipTrigger>
        <TooltipContent side="right">
          {collapsed ? 'Expand sidebar' : 'Collapse sidebar'} (⌘B)
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}

function MobileHeader({ viewer }: { viewer?: Viewer | undefined }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0/95 px-4 backdrop-blur lg:hidden">
      <Brand />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <CompactButton.Root
            variant="stroke"
            size="large"
            aria-label="Open navigation"
          >
            <CompactButton.Icon as={RiMenu3Line} />
          </CompactButton.Root>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[10px] lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex h-full w-[min(86vw,300px)] flex-col bg-bg-white-0 p-4 shadow-regular-md outline-none lg:hidden">
            <Dialog.Title className="text-label-md font-semibold text-text-strong-950 pb-2">
              Navigation
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Workspace navigation menu
            </Dialog.Description>
            <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
              Workspace
            </p>
            <NavigationLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto pt-8">
              <UserButton viewer={viewer} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}

export function AppShell({
  viewer,
  children,
}: {
  viewer?: Viewer | undefined;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setCollapsed((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((current) => !current);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-bg-weak-50">
        <Sidebar
          collapsed={collapsed}
          viewer={viewer}
          onToggle={toggleSidebar}
        />
        <div
          className={cn(
            'min-h-screen transition-[padding] duration-300 ease-out',
            collapsed ? 'lg:pl-[82px]' : 'lg:pl-[272px]',
          )}
        >
          <MobileHeader viewer={viewer} />
          <main
            id="main-content"
            className="mx-auto min-h-screen w-full max-w-[1440px] p-4 sm:p-6 lg:p-8"
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AppShell;
