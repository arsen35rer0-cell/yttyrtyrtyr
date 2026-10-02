function consoleBridge() {
  function storageShim() {
    const data = new Map();

    return {
      getItem(key) {
        return data.has(String(key)) ? data.get(String(key)) : null;
      },
      setItem(key, value) {
        data.set(String(key), String(value));
      },
      removeItem(key) {
        data.delete(String(key));
      },
      clear() {
        data.clear();
      },
      key(index) {
        return Array.from(data.keys())[index] || null;
      },
      get length() {
        return data.size;
      }
    };
  }

  function ensureStorage(name) {
    try {
      window[name].getItem('__webforge_test__');
    } catch (error) {
      Object.defineProperty(window, name, {
        value: storageShim(),
        configurable: true
      });
    }
  }

  ensureStorage('localStorage');
  ensureStorage('sessionStorage');

  function serialize(value, depth) {
    try {
      if (value === null) {
        return 'null';
      }

      if (value === undefined) {
        return 'undefined';
      }

      const type = typeof value;

      if (type === 'string') {
        return value;
      }

      if (type === 'number' || type === 'boolean' || type === 'bigint') {
        return String(value);
      }

      if (type === 'function') {
        return '[Function ' + (value.name || 'anonymous') + ']';
      }

      if (value instanceof Error) {
        return value.stack || value.message;
      }

      if (typeof Promise !== 'undefined' && value instanceof Promise) {
        return '[Promise]';
      }

      if (typeof Element !== 'undefined' && value instanceof Element) {
        return '<' + value.tagName.toLowerCase() + (value.id ? '#' + value.id : '') + '>';
      }

      if (type === 'object') {
        if (depth > 3) {
          return '[Object]';
        }

        if (Array.isArray(value)) {
          const items = [];

          for (let i = 0; i < value.length && i < 50; i += 1) {
            items.push(serialize(value[i], depth + 1));
          }

          return '[' + items.join(', ') + (value.length > 50 ? ', ...' : '') + ']';
        }

        const keys = Object.keys(value).slice(0, 30);
        const parts = [];

        for (let i = 0; i < keys.length; i += 1) {
          try {
            parts.push(JSON.stringify(keys[i]) + ':' + serialize(value[keys[i]], depth + 1));
          } catch (itemError) {
            parts.push(JSON.stringify(keys[i]) + ':[Unserializable]');
          }
        }

        return '{' + parts.join(', ') + '}';
      }

      return String(value);
    } catch (error) {
      return '[Unserializable ' + String(error) + ']';
    }
  }

  function send(level, args) {
    try {
      const payload = [];

      for (let i = 0; i < args.length; i += 1) {
        payload.push(serialize(args[i], 0));
      }

      parent.postMessage(
        {
          source: 'webforge-preview',
          type: 'console',
          level: level,
          payload: payload
        },
        '*'
      );
    } catch (error) {
      // Ничего страшного, если предпросмотр не может отправить сообщение.
    }
  }

  const methods = ['log', 'info', 'warn', 'error', 'debug'];

  for (let i = 0; i < methods.length; i += 1) {
    (function (methodName) {
      const original = console[methodName];

      console[methodName] = function () {
        send(methodName, arguments);

        if (original) {
          original.apply(console, arguments);
        }
      };
    })(methods[i]);
  }

  window.addEventListener('error', function (event) {
    send('error', [
      event.message + ' (line ' + (event.lineno || '?') + ', col ' + (event.colno || '?') + ')'
    ]);
  });

  window.addEventListener('unhandledrejection', function (event) {
    send('error', ['Unhandled rejection: ' + serialize(event.reason, 0)]);
  });
}

const BRIDGE_SOURCE = '(' + consoleBridge.toString() + ')();';

function scriptTag(code) {
  return '<scr' + 'ipt>' + code + '</scr' + 'ipt>';
}

function styleTag(code) {
  return '<sty' + 'le>' + code + '</sty' + 'le>';
}

function safeJavaScript(js) {
  return String(js || '').replace(/<\/script/gi, '<\\/script');
}

function safeCss(css) {
  return String(css || '').replace(/<\/style/gi, '<\\/style');
}

function composeDocument(options) {
  const html = String(options.html || '');
  const css = String(options.css || '');
  const js = String(options.js || '');

  const bridge = options.includeBridge ? scriptTag(BRIDGE_SOURCE) : '';
  const style = styleTag(safeCss(css));
  const script = scriptTag(safeJs(js));

  if (/<html[\s>]/i.test(html)) {
    let document = html;

    if (/<head[^>]*>/i.test(document)) {
      document = document.replace(/<head[^>]*>/i, (match) => {
        return match + '\n' + bridge + '\n' + style;
      });
    } else {
      document = bridge + '\n' + style + '\n' + document;
    }

    if (/<\/body>/i.test(document)) {
      document = document.replace(/<\/body>/i, script + '\n</body>');
    } else {
      document += '\n' + script;
    }

    return document;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${bridge}
  ${style}
</head>
<body>
${html}
${script}
</body>
</html>`;
}

export function buildPreviewHtml(files) {
  return composeDocument({
    html: files['index.html'],
    css: files['style.css'],
    js: files['script.js'],
    includeBridge: true
  });
}

export function buildExportHtml(files) {
  return composeDocument({
    html: files['index.html'],
    css: files['style.css'],
    js: files['script.js'],
    includeBridge: false
  });
}
