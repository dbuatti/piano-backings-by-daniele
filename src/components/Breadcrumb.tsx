"use client";

import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Breadcrumb"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8"
    >
      <ol className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400" role="breadcrumbs">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-gray-300" aria-hidden="true" />}
              {isLast || isActive ? (
                <span className="text-[#1C0357] font-black" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-gray-600 hover:text-[#F538BC] transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
