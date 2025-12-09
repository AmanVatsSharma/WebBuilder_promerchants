/**
 * @file registry.ts
 * @module builder-core
 * @description Component registry for the builder
 * @author BharatERP
 * @created 2025-02-09
 */
import React from 'react';

export interface ComponentProps {
  [key: string]: any;
}

export type BuilderComponent = React.FC<ComponentProps>;

export const ComponentRegistry: Record<string, BuilderComponent> = {};

export function registerComponent(name: string, component: BuilderComponent) {
  ComponentRegistry[name] = component;
}

export function getComponent(name: string): BuilderComponent | undefined {
  return ComponentRegistry[name];
}

