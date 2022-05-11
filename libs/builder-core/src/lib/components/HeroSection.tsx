/**
 * @file HeroSection.tsx
 * @module builder-core
 * @description Hero section component
 * @author BharatERP
 * @created 2025-02-09
 */
import React from 'react';

export const HeroSection: React.FC<{ title: string; subtitle?: string; backgroundImageUrl?: string }> = ({
  title,
  subtitle,
  backgroundImageUrl,
}) => {
  const style: React.CSSProperties | undefined = backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(37,99,235,0.75), rgba(37,99,235,0.75)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div className="bg-blue-600 text-white py-20 px-8 text-center" style={style}>
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      {subtitle && <p className="text-xl">{subtitle}</p>}
    </div>
  );
};

