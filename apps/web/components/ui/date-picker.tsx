// AlignUI DatePicker Component
'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiCloseLine,
} from '@remixicon/react';

import { cn } from '@/utils/cn';
import { formatDateOnly } from '@/lib/format';
import * as CompactButton from './compact-button';
import * as Divider from './divider';

export interface DatePickerProps {
  value?: string | undefined; // YYYY-MM-DD format
  onChange?: ((date: string) => void) | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  hasError?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  presets?: boolean | Array<{ label: string; days: number }> | undefined;
  size?: 'small' | 'medium' | undefined;
  'aria-label'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
}

const defaultPresets = [
  { label: 'Today', days: 0 },
  { label: '+7 days', days: 7 },
  { label: '+14 days', days: 14 },
  { label: '+30 days', days: 30 },
];

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDateString(baseDate: string, days: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  hasError = false,
  id,
  className,
  minDate,
  maxDate,
  presets = true,
  size = 'medium',
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse initial view month/year from value or current date
  const parsedValueDate = React.useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [value]);

  const [navMonthOffset, setNavMonthOffset] = React.useState<number>(0);

  // Derive active view month from parsed date or today + user navigation offset
  const viewDate = React.useMemo(() => {
    const base = parsedValueDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth() + navMonthOffset, 1);
  }, [parsedValueDate, navMonthOffset]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setNavMonthOffset((prev) => prev - 1);
  };

  const handleNextMonth = () => {
    setNavMonthOffset((prev) => prev + 1);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setNavMonthOffset(0);
    }
    setOpen(newOpen);
  };

  const handleSelectDate = (dateStr: string) => {
    onChange?.(dateStr);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  // Generate calendar days for the current viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = getTodayString();

  const activePresets = Array.isArray(presets)
    ? presets
    : presets
      ? defaultPresets
      : [];

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel || placeholder}
          className={cn(
            'group relative flex w-full items-center justify-between bg-bg-white-0 text-left outline-none transition duration-200 ease-out',
            'ring-1 ring-inset ring-stroke-soft-200 shadow-regular-xs',
            'hover:bg-bg-weak-50 hover:ring-stroke-sub-300',
            'focus-visible:shadow-button-important-focus focus-visible:ring-stroke-strong-950',
            'disabled:pointer-events-none disabled:bg-bg-weak-50 disabled:text-text-disabled-300 disabled:ring-stroke-soft-200 disabled:shadow-none',
            hasError && 'ring-error-base focus-visible:ring-error-base focus-visible:shadow-button-error-focus',
            size === 'medium' ? 'h-10 rounded-10 px-3 py-2 text-paragraph-sm' : 'h-9 rounded-lg px-2.5 py-1.5 text-paragraph-xs',
            className,
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <RiCalendarEventLine
              className={cn(
                'size-4 shrink-0 transition-colors',
                value ? 'text-primary-base' : 'text-text-soft-400 group-hover:text-text-sub-600',
              )}
            />
            {value ? (
              <span className="truncate font-medium text-text-strong-950">
                {formatDateOnly(value)}
              </span>
            ) : (
              <span className="truncate text-text-soft-400">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="grid size-5 place-items-center rounded-sm text-text-soft-400 hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
              >
                <RiCloseLine className="size-3.5" />
              </span>
            )}
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className={cn(
            'z-50 w-[288px] overflow-hidden rounded-2xl bg-bg-white-0 p-3.5 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          )}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2">
            <CompactButton.Root
              variant="stroke"
              size="medium"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <CompactButton.Icon as={RiArrowLeftSLine} />
            </CompactButton.Root>

            <div className="text-label-sm font-semibold text-text-strong-950">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <CompactButton.Root
              variant="stroke"
              size="medium"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <CompactButton.Icon as={RiArrowRightSLine} />
            </CompactButton.Root>
          </div>

          {/* Presets Row */}
          {activePresets.length > 0 && (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5 pt-1">
              {activePresets.map((preset) => {
                const targetDate = addDaysToDateString(todayStr, preset.days);
                const isSelected = value === targetDate;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectDate(targetDate)}
                    className={cn(
                      'rounded-md px-2 py-1 text-subheading-2xs font-medium transition',
                      isSelected
                        ? 'bg-primary-base text-static-white font-semibold'
                        : 'bg-bg-weak-50 text-text-sub-600 hover:bg-bg-soft-200/60 hover:text-text-strong-950 ring-1 ring-inset ring-stroke-soft-200',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          <Divider.Root className="my-2" />

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center">
            {DAY_NAMES.map((name) => (
              <span
                key={name}
                className="py-1 text-subheading-2xs uppercase text-text-soft-400 font-medium"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-paragraph-xs">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <span
                  key={`prev-${dayNum}`}
                  className="grid size-8 place-items-center text-text-soft-400/40"
                >
                  {dayNum}
                </span>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = dateStr === todayStr;
              const isDisabled = Boolean(
                (minDate && dateStr < minDate) ||
                (maxDate && dateStr > maxDate),
              );

              return (
                <button
                  key={`curr-${dayNum}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(dateStr)}
                  className={cn(
                    'group relative grid size-8 place-items-center rounded-lg transition duration-150 ease-out outline-none',
                    'focus-visible:ring-2 focus-visible:ring-stroke-strong-950',
                    isSelected
                      ? 'bg-primary-base font-semibold text-static-white shadow-button-primary-focus'
                      : 'text-text-strong-950 hover:bg-bg-weak-50',
                    isToday && !isSelected && 'ring-1 ring-inset ring-primary-base/40 font-semibold text-primary-base',
                    isDisabled && 'pointer-events-none opacity-25 text-text-disabled-300',
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="mt-2.5 flex items-center justify-between border-t border-stroke-soft-200 pt-2 text-paragraph-xs">
            <button
              type="button"
              onClick={() => handleSelectDate(todayStr)}
              className="text-label-xs font-semibold text-primary-base hover:underline"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange?.('');
                  setOpen(false);
                }}
                className="text-label-xs text-text-soft-400 hover:text-text-strong-950"
              >
                Clear
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
