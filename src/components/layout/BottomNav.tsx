'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  BarChart3,
  Settings,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/workout', label: 'Workout', icon: Dumbbell },
  { href: '/app/routine', label: 'Routine', icon: CalendarDays },
  { href: '/app/insights', label: 'Insights', icon: BarChart3 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

/**
 * BottomNav — Mobile bottom navigation with 5 items
 * Dashboard / Workout / Routine / Insights / Settings
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--glass-border)] bg-[var(--color-base-800)]/95 backdrop-blur-lg safe-area-bottom"
      style={{ height: 'var(--bottom-nav-height)' }}
    >
      <ul className="flex h-full items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 touch-target transition-colors ${
                  isActive
                    ? 'text-[var(--color-accent-purple)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <Icon
                  className={`h-6 w-6 transition-transform ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
