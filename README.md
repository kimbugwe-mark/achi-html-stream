# achi-html-stream

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**achi-html-stream** is an HTML streaming and templating library for multi-page Progressive Web Apps. It is designed to render HTML from a **service worker**, and also runs on **Node.js**, **Bun**, **Deno** and edge runtimes that support Web Streams.

It uses tagged template literals with automatic XSS escaping, async values, readable-stream embedding/piping and response, with zero runtime dependencies.

## Features

- **Streaming by design**: HTML is flushed progressively as data resolves, without buffering whole pages.
- **Escaped by default**: interpolated strings and array items are HTML-escaped. Raw HTML is opt-in via `UnSafeHTML`.
- **Async and stream embedding**: interpolate `Promise`, `ReadableStream`, `Response` and `Request` values directly.
- **Cached compilation**:
- 🚀 **Cached Template Compilation** – `html` compiles template literals into optimized generator functions and caches them using `WeakMap` for maximum throughput.
- **Multi-runtime**: dedicated entry points for Web Standards (`achi-html-stream/browser`) and Node.js (`achi-html-stream/node`).
- **Zero dependencies**.

## Installation

```bash
npm install achi-html-stream
# or: pnpm add achi-html-stream / yarn add achi-html-stream / bun add achi-html-stream
```

### CDN / `<script>`

````html
Pre-bundled builds expose `window.achiHTML`. ```html
<script src="https://unpkg.com/achi-html-stream"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/achi-html-stream"></script>
````

Pin a version in production, for example `https://unpkg.com/achi-html-stream@1.2.3`.

## Quick start

### Service worker

Return a streaming `Response` from a `fetch` handler:

```ts
import { html, render } from "achi-html-stream";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/") {
    event.respondWith(
      render(
        html`<!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <title>PWA Streaming</title>
            </head>
            <body>
              <h1>Hello, ${"world"}!</h1>
            </body>
          </html>`,
        { "Cache-Control": "no-cache" },
      ),
    );
  }
});
```

`render()` sets `Content-Type: text/html; charset=utf-8` by default and streams the output through a native `Response`.

### Node.js

The Node entry point pipes the rendered stream into a `http.ServerResponse`:

```ts
import { createServer } from "node:http";
import { html, render } from "achi-html-stream";
//require("achi-html-stream")

createServer((req, res) => {
  render(
    res,
    html`<!doctype html>
      <html>
        <body>
          <h1>Requested: ${req.url}</h1>
          <p>Time: ${new Date().toISOString()}</p>
        </body>
      </html>`,
    { "X-Powered-By": "achi-html-stream" },
  );
}).listen(3000);
```

### Edge runtimes (Deno, Bun, Hono, ...)

Anything that accepts a Web `Response` works:

```ts
import { html, render } from "achi-html-stream";
//or import { html, render } from 'achi-html-stream/node' for node compatibility

export default {
  async fetch(): Promise<Response> {
    const user = fetch("https://api.example.com/user").then((r) => r.json());

    return render(
      html`<!doctype html>
        <html>
          <body>
            <h1>Welcome, ${(async () => (await user).name)()}</h1>
          </body>
        </html>`,
    );
  },
};
```

> **Cloudflare Workers and strict CSP:** `html` generates its compiled function at runtime, which runtimes that block dynamic code evaluation reject. Use [`liveHTML`](#html-vs-livehtml) there.

### Render to a string

For SSG, static output or emails:

```ts
import { html, renderAsString } from "achi-html-stream";

const page = await renderAsString(
  html`<main><h1>${"Hello Static HTML"}</h1></main>`,
);
// <main><h1>Hello Static HTML</h1></main>
```

### Render to a stream

Use `renderStream()` when you want the raw `ReadableStream<string>` instead of a `Response`, for example to pipe it somewhere yourself, wrap it in your own `Response`, or transform it:

```ts
import { html, renderStream } from "achi-html-stream";

const stream = renderStream(html`<h1>${"Hello"}</h1>`);

// Wrap it in your own Response
return new Response(stream.pipeThrough(new TextEncoderStream()), {
  headers: { "Content-Type": "text/html; charset=utf-8" },
});

// Or read the chunks directly
for await (const chunk of stream) {
  console.log(chunk);
}
```

## Values and escaping

| Interpolated value         | Handling                                         |
| :------------------------- | :----------------------------------------------- |
| `string`                   | HTML-escaped (`&` `<` `>` `"` `'`)               |
| `UnSafeHTML`               | Inserted raw, unescaped                          |
| `number`                   | Inserted as-is                                   |
| `Error`                    | Inserted as its string form (not escaped)        |
| `Array` / iterable         | Flattened; strings inside are escaped            |
| `html` / `liveHTML` result | Inserted without being escaped twice             |
| `Promise`                  | Awaited, then handled by these same rules        |
| `Response`                 | Body streamed in as text (not escaped)           |
| `Request`                  | Fetched, response body streamed in (not escaped) |
| `ReadableStream<string>`   | Chunks piped in (not escaped)                    |
| `null` / `undefined`       | Omitted                                          |

```ts
import { html, renderAsString } from "achi-html-stream";

const unsafeText = '<script>alert("hello")</script>';
await renderAsString(html`<p>${unsafeText}</p>`);
// <p>&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;</p>
```

### Raw HTML with `UnSafeHTML`

For trusted or already-sanitized markup (SVG icons, sanitized Markdown):

```ts
import { html, renderAsString, UnSafeHTML } from "achi-html-stream";

const icon = new UnSafeHTML(
  '<svg aria-hidden="true" width="24" height="24">...</svg>',
);
const output = await renderAsString(html`<span>${icon}</span>`);
```

> **Warning:** only pass trusted or previously sanitized content to `UnSafeHTML`.

## Streaming async data

Put promises and streams straight into a template. Everything before them is sent immediately, and each async part streams in when it is ready:

```ts
import { html, render } from "achi-html-stream/browser";

function userProfile(id: string) {
  const user = fetch(`/api/users/${id}`).then((res) => res.json());

  return render(html`
    <div class="profile">
      <!-- Sent immediately -->
      <header><h1>User Profile</h1></header>

      <!-- Streams in when the fetch resolves -->
      <section><h2>${(async () => (await user).name)()}</h2></section>

      <!-- Streams as chunks arrive from the network -->
      <section class="activity">${fetch(`/api/users/${id}/activity`)}</section>
    </div>
  `);
}
```

A raw `ReadableStream` must emit **strings**. If you have a byte stream (for example `response.body`), decode it first, or interpolate the `Response` itself:

```ts
const text = response.body!.pipeThrough(new TextDecoderStream());
html`<section>${text}</section>`;
```

## `html` vs `liveHTML`

- **`html`** (recommended): caches the compiled generator per template literal, so repeated renders with different values are fast.
- **`liveHTML`**: yields chunks directly on every call, with no compilation or caching. It works where dynamic code evaluation is blocked, and is useful for one-off templates or inspecting yielded chunks.

```ts
import { html, liveHTML, renderAsString } from "achi-html-stream";

const greeting = (name: string) => html`<p>Hello, ${name}!</p>`;
await renderAsString(greeting("Alice"));
await renderAsString(greeting("Bob"));

for (const chunk of liveHTML`<div>${"now"} ${Promise.resolve("later")}</div>`) {
  // Send or process each chunk.
}
```

## API reference

### Entry points

| Import                     | Targets                                                                                             |
| :------------------------- | :-------------------------------------------------------------------------------------------------- |
| `achi-html-stream`         | Default. Resolves to Node.js, or to the browser build under `bun`, `deno` and `browser` conditions. |
| `achi-html-stream/browser` | Web Standards (`Response`, `ReadableStream`, `TextEncoderStream`).                                  |
| `achi-html-stream/node`    | Node.js (`http.ServerResponse`, `node:stream`).                                                     |

### `html(strings, ...values)`

Tagged template with cached generator compilation. Returns a generator of HTML chunks and deferred values.

### `liveHTML(strings, ...values)`

Tagged template generator without caching.

### `render(template, headers?, status?, statusText?)` (browser)

Returns a Web `Response` with a streaming UTF-8 body.

| Param        | Default                                                             |
| :----------- | :------------------------------------------------------------------ |
| `template`   | Generator from `html` or `liveHTML`                                 |
| `headers`    | `{ 'Content-Type': 'text/html; charset=utf-8' }`, merged with yours |
| `status`     | `200`                                                               |
| `statusText` | `'OK'`                                                              |

### `render(response, template, headers?, status?, statusText?)` (Node.js)

Pipes the rendered output into a `http.ServerResponse`. Same defaults as above. Returns `void`.

### `renderStream(template)`

Returns `ReadableStream<string>` of rendered chunks.

### `renderAsString(template)`

Returns `Promise<string>` with the full rendered HTML.

### `new UnSafeHTML(rawHtml)`

Wraps a string so it bypasses escaping.

### `escapeHTML(value)`

Returns the string with `&`, `<`, `>`, `"` and `'` replaced by HTML entities.

## Security and caveats

- Escaping covers text content and **quoted** attribute values. Always quote attributes: `<a title="${title}">`.
- Escaping does not make URLs safe. Validate `href` and `src` values (for example, reject `javascript:`).
- Don't interpolate untrusted data inside `<script>` or `<style>`.
- `UnSafeHTML`, `Response`, `Request`, `ReadableStream` and `Error` values are **not** escaped. Keep untrusted input out of them.
- With `html`, each `${}` position should receive the same kind of value on every call (always a string, always an array, and so on), because the compiled template is cached. Use `liveHTML` if a position can change type.
  ReadableStream must yield strings

## Editor support

Install the **[lit-plugin](https://marketplace.visualstudio.com/items?itemName=runem.lit-plugin)** extension for VS Code (by Rune Mehlsen, `runem.lit-plugin`). It recognizes the `html` tag and gives you HTML syntax highlighting, tag and attribute auto-completion, and diagnostics inside your templates in `.js` and `.ts` files.

lit-plugin is built for Lit, so Lit-specific features such as property and event bindings don't apply to achi-html-stream.

## Structuring components

Write components as functions that take a single props object and return an `html` template:

```javascript
export function Header({ title }) {
  return html`
    <header>
      <section>Home</section>
      <section>${title}</section>
      <section><a href="/about">about</a></section>
    </header>
  `;
}
```

Compose them by calling them inside other templates:

```javascript
const page = html`
  ${Header({ title: "Welcome" })}
  <main>...</main>
`;
```

This is better than positional arguments such as `Header(title, showNav, user)`:

- **Clearer call sites:** `Header({ title: 'Welcome' })` documents itself, and argument order never matters.
- **Easier to maintain:** adding or removing a prop doesn't break existing callers.
- **Simple defaults:** `function Header({ title = 'Untitled' })`.
- **Safe composition:** the returned template is inserted without being escaped twice, while string props are still escaped.
- **Examples:** check out the github repo for examples

## Runtime support

achi-html-stream relies on Web Streams (`ReadableStream`, `TextEncoderStream`, `TextDecoderStream`), the global `Response`, and ES2021 syntax, so it needs these minimum versions:

| Runtime            | Minimum version                    | Import from                                      |
| :----------------- | :--------------------------------- | :----------------------------------------------- |
| Node.js            | 18+                                | `achi-html-stream` or `achi-html-stream/node`    |
| Bun                | 1.x                                | `achi-html-stream` or `achi-html-stream/browser` |
| Deno               | Current releases                   | `achi-html-stream` or `achi-html-stream/browser` |
| Chrome / Edge      | 85+                                | `achi-html-stream`                               |
| Firefox            | 105+                               | `achi-html-stream`                               |
| Safari             | 14.1+                              | `achi-html-stream`                               |
| Service workers    | Same as the browser versions above | `achi-html-stream`                               |
| Cloudflare Workers | Current runtime, using `liveHTML`  | `achi-html-stream`                               |

Notes:

- **Firefox 105** is the floor because earlier versions lack `TextEncoderStream` and `TextDecoderStream`.
- **Node.js** versions before 18 don't provide the global Web Streams and `Response` APIs. Use an actively supported LTS release.
- **Dynamic code evaluation:** `html` compiles templates at runtime. In environments that block it, such as Cloudflare Workers or pages with a strict CSP, use `liveHTML` instead.
- **Older browsers:** transpile the package and polyfill Web Streams, or render on the server.

To enforce the Node requirement, add this to `package.json`:

```json
"engines": {
  "node": ">=18"
}
```

## Development

```bash
pnpm install     # install dependencies
pnpm test        # run unit tests (Vitest)
pnpm typecheck   # type-check
pnpm build       # build ESM, CJS and IIFE bundles
```

## License

[MIT](LICENSE) © [Kimbugwe Mark](mailto:markkimbugwe@gmail.com)
