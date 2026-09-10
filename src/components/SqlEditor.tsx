import { useEffect, useRef, useState } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';

export function SqlEditor({
  value,
  onChange,
  onExecute,
  disableCopyPaste = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onExecute: () => void;
  disableCopyPaste?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);
  const [blockedToast, setBlockedToast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  onChangeRef.current = onChange;
  onExecuteRef.current = onExecute;

  const triggerBlockedNotice = () => {
    setBlockedToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setBlockedToast(false), 2500);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const keymapsList = [
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => { onExecuteRef.current(); return true; },
      },
    ];

    if (disableCopyPaste) {
      const blockKeys = ['Mod-c', 'Mod-v', 'Mod-x', 'Ctrl-c', 'Ctrl-v', 'Ctrl-x', 'Cmd-c', 'Cmd-v', 'Cmd-x'];
      blockKeys.forEach((key) => {
        keymapsList.push({
          key,
          mac: key,
          run: () => {
            triggerBlockedNotice();
            return true;
          },
        });
      });
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        sql(),
        keymap.of(keymapsList),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%', minHeight: '200px' },
          '.cm-scroller': { fontFamily: 'var(--font-code)', fontSize: '0.88rem', overflow: 'auto' },
          '.cm-content': { padding: '12px 0' },
          '.cm-line': { padding: '0 14px' },
          '.cm-gutters': {
            background: '#F5F0E8',
            borderRight: '1px solid rgba(31,27,22,0.10)',
            color: '#6B6558',
            minWidth: '40px',
          },
          '.cm-activeLineGutter': { background: 'rgba(43,58,103,0.06)' },
          '.cm-activeLine': { background: 'rgba(43,58,103,0.04)' },
          '.cm-cursor': { borderLeftColor: '#2B3A67' },
          '.cm-selectionBackground': { background: 'rgba(43,58,103,0.12) !important' },
          '&.cm-focused .cm-selectionBackground': { background: 'rgba(43,58,103,0.18) !important' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    const el = containerRef.current;
    const blockEvent = (e: Event) => {
      if (disableCopyPaste) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlockedNotice();
        return false;
      }
    };

    if (disableCopyPaste && el) {
      ['copy', 'cut', 'paste', 'contextmenu', 'dragstart'].forEach((ev) => {
        el.addEventListener(ev, blockEvent);
      });
    }

    return () => {
      if (disableCopyPaste && el) {
        ['copy', 'cut', 'paste', 'contextmenu', 'dragstart'].forEach((ev) => {
          el.removeEventListener(ev, blockEvent);
        });
      }
      view.destroy();
      viewRef.current = null;
    };
  }, [disableCopyPaste]);

  // Sync external value changes (e.g. load draft / switch question)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div style={{ position: 'relative' }}>
      {blockedToast && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            zIndex: 99,
            background: 'rgba(217, 83, 79, 0.95)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          role="alert"
        >
          🚫 Copy/Paste is disabled during lab experiments!
        </div>
      )}
      <div
        ref={containerRef}
        style={{ minHeight: '220px' }}
        aria-label="SQL query editor"
        role="textbox"
        aria-multiline
      />
    </div>
  );
}
