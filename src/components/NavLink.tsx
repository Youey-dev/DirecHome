import React from 'react';
import { pathFor } from '../lib/routes';

/**
 * A real link (<a href>) that search engines can follow, which still switches pages
 * inside the app without a reload. Ctrl/Cmd-click and middle-click open a new tab as usual.
 */
export const NavLink: React.FC<
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
    to: string;
    listingId?: string;
    onNavigate: (tab: string, listingId?: string) => void;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }
> = ({ to, listingId, onNavigate, onClick, children, ...rest }) => (
  <a
    {...rest}
    href={pathFor(to, listingId)}
    onClick={(e) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onNavigate(to, listingId);
    }}
  >
    {children}
  </a>
);
