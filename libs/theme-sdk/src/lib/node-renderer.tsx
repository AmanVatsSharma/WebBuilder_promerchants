/**
 * @file node-renderer.tsx
 * @module theme-sdk
 * @description JSON node renderer that supports core components + installed extension blocks
 * @author BharatERP
 * @created 2026-01-24
 */

import React from 'react';
import { getComponent, registerCoreComponents } from '@web-builder/builder-core';
import type { PageNode } from '@web-builder/contracts';
import { useThemeSdk } from './theme-sdk';

let didRegister = false;
function ensureRegistered() {
  if (didRegister) return;
  didRegister = true;
  registerCoreComponents();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function ThemeNodeRenderer({ node }: { node: PageNode }) {
  const { extensions } = useThemeSdk();
  ensureRegistered();

  if (!node || !node.type) return null;

  if (node.type === 'Container') {
    return (
      <div>
        {(node.children || []).map((c) => (
          <ThemeNodeRenderer key={c.id} node={c} />
        ))}
      </div>
    );
  }

  const core = getComponent(node.type);
  const ext = extensions?.blocks?.[node.type] as React.ComponentType<any> | undefined;
  const Comp = core || ext || null;

  if (!Comp) {
    return (
      <div style={{ padding: 12, border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 12 }}>
        Unknown block: <code>{node.type}</code>
      </div>
    );
  }

  const props = isRecord(node.props) ? node.props : {};
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Comp {...props} />;
}

