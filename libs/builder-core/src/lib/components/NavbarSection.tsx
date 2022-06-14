/**
 * @file NavbarSection.tsx
 * @module builder-core
 * @description Top navigation section component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

function parseLinks(raw?: string): Array<{ label: string; href: string }> {
  const fallback = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const rows = parsed
      .filter(
        (item) =>
          item &&
          typeof item.label === 'string' &&
          typeof item.href === 'string',
      )
      .slice(0, 8);
    return rows.length ? rows : fallback;
  } catch {
    return fallback;
  }
}

export const NavbarSection: React.FC<{
  brandName?: string;
  links?: string;
  style?: React.CSSProperties;
}> = ({ brandName = 'WebBuilder', links, style }) => {
  const navLinks = parseLinks(links);
  return (
    <nav className="border-b bg-white px-6 py-4 flex items-center justify-between" style={style}>
      <div className="font-bold text-slate-900">{brandName}</div>
      <div className="flex items-center gap-4 text-sm">
        {navLinks.map((link) => (
          <a key={`${link.href}-${link.label}`} href={link.href} className="text-slate-700 hover:text-slate-900">
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
};
