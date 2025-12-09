/**
 * @file HeroSection.tsx
 * @module builder-core
 * @description Hero section component
 * @author BharatERP
 * @created 2025-02-09
 */
import React from 'react';

export const HeroSection: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  return (
    <div className="bg-blue-600 text-white py-20 px-8 text-center">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      {subtitle && <p className="text-xl">{subtitle}</p>}
    </div>
  );
};

