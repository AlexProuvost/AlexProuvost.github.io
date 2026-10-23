import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Link / redirect / usePathname conscients de la langue. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
