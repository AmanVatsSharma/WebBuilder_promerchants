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

export * from './lib/registry';
export * from './lib/PageRenderer';
export * from './lib/components/HeroSection';
export * from './lib/components/TextBlock';

export function registerCoreComponents() {
  registerComponent('HeroSection', HeroSection);
  registerComponent('TextBlock', TextBlock);
  registerComponent('Container', (props) => React.createElement('div', props, props.children));
}
