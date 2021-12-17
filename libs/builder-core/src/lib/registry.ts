/**
 * File: libs/builder-core/src/lib/registry.ts
 * Module: builder-core
 * Purpose: Component registry for the builder renderer
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Components can have specific prop types; registry stores them as ComponentType<any>
 * - Editor validates/constructs props at runtime; TypeScript cannot fully type theme-defined components
 */
import React from 'react';

export type BuilderComponent = React.ComponentType<any>;

export const ComponentRegistry: Record<string, BuilderComponent> = {};

export function registerComponent<TProps = any>(name: string, component: React.ComponentType<TProps>) {
  ComponentRegistry[name] = component;
}

export function getComponent(name: string): BuilderComponent | undefined {
  return ComponentRegistry[name];
}

