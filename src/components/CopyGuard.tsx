import { useRef } from 'react';
import type { ReactNode, ElementType } from 'react';
import { useCopyProtection } from '../hooks/useCopyProtection';

/**
 * Convenience wrapper around useCopyProtection: renders a container, scopes the
 * copy/paste/context-menu block to it, and disables text selection via the
 * `.copy-protected` class. Use around read-only content (prompts, schema,
 * expected output) — never around the SQL editor.
 */
export function CopyGuard({
  children,
  as: Tag = 'div',
  className = '',
  enabled = true,
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  enabled?: boolean;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement>(null);
  useCopyProtection(ref, enabled);

  return (
    <Tag
      ref={ref}
      className={`${enabled ? 'copy-protected' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
