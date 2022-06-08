/**
 * @file index.ts
 * @module builder-core
 * @description Public API for builder-core
 * @author BharatERP
 * @created 2025-02-09
 */
import React from 'react';
import { registerComponent } from './lib/registry';
import { HeroSection } from './lib/components/HeroSection';
import { TextBlock } from './lib/components/TextBlock';
import { RichTextBlock } from './lib/components/RichTextBlock';
import { ButtonBlock } from './lib/components/ButtonBlock';
import { ImageBlock } from './lib/components/ImageBlock';
import { GridSection } from './lib/components/GridSection';
import { FormBlock } from './lib/components/FormBlock';
import { TestimonialSection } from './lib/components/TestimonialSection';
import { ProductListSection } from './lib/components/ProductListSection';
import { CtaBannerSection } from './lib/components/CtaBannerSection';
import { FaqSection } from './lib/components/FaqSection';
import { NavbarSection } from './lib/components/NavbarSection';
import { FooterSection } from './lib/components/FooterSection';

export * from './lib/registry';
export * from './lib/PageRenderer';
export * from './lib/components/HeroSection';
export * from './lib/components/TextBlock';
export * from './lib/components/RichTextBlock';
export * from './lib/components/ButtonBlock';
export * from './lib/components/ImageBlock';
export * from './lib/components/GridSection';
export * from './lib/components/FormBlock';
export * from './lib/components/TestimonialSection';
export * from './lib/components/ProductListSection';
export * from './lib/components/CtaBannerSection';
export * from './lib/components/FaqSection';
export * from './lib/components/NavbarSection';
export * from './lib/components/FooterSection';

export function registerCoreComponents() {
  registerComponent('HeroSection', HeroSection);
  registerComponent('TextBlock', TextBlock);
  registerComponent('RichTextBlock', RichTextBlock);
  registerComponent('ButtonBlock', ButtonBlock);
  registerComponent('ImageBlock', ImageBlock);
  registerComponent('GridSection', GridSection);
  registerComponent('FormBlock', FormBlock);
  registerComponent('TestimonialSection', TestimonialSection);
  registerComponent('ProductListSection', ProductListSection);
  registerComponent('CtaBannerSection', CtaBannerSection);
  registerComponent('FaqSection', FaqSection);
  registerComponent('NavbarSection', NavbarSection);
  registerComponent('FooterSection', FooterSection);
  registerComponent('Container', (props) => React.createElement('div', props, props.children));
}
