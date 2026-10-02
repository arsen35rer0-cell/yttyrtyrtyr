import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

function getLanguage(file) {
  if (file.endsWith('.css')) {
    return css();
  }

  if (file.endsWith('.js')) {
    return javascript();
  }

  return html();
}

export function createEditor({ file, doc, parent, dark, onChange, onCursor }) {
  const themeCompartment = new Compartment();

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange?.(update.state.doc.toString());
    }

    if (update.docChanged || update.selectionSet) {
      const position = update.state.selection.main.head;
      const line = update.state.doc.lineAt(position);

      onCursor?.(`Стр ${line.number}, стлб ${position - line.from + 1}`);
    }
  });

  const extensions = [
    basicSetup,
    getLanguage(file),
    themeCompartment.of(dark ? oneDark : []),
    updateListener,
    EditorView.lineWrapping,
    EditorView.theme({
      '&': {
        height: '100%'
      },
      '.cm-scroller': {
        overflow: 'auto'
      }
    })
  ];

  const root = document.createElement('div');
  root.className = 'editor-pane';

  parent.appendChild(root);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions
    }),
    parent: root
  });

  function setTheme(isDark) {
    view.dispatch({
      effects: themeCompartment.reconfigure(isDark ? oneDark : [])
    });
  }

  return {
    file,
    root,
    view,
    setTheme
  };
}
