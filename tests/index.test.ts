import { expect, test } from 'vitest'
import { html, liveHTML, render, renderAsString, UnSafeHTML } from '../src/index.browser'

test('renders and escapes interpolated strings', async () => {
  const value = '<script>alert("x")</script>'

  await expect(renderAsString(html`<p>${value}</p>`)).resolves.toBe(
    '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>',
  )
})

test('escapes every HTML-sensitive character', async () => {
  await expect(renderAsString(html`${"& < > \" '"}`)).resolves.toBe(
    '&amp; &lt; &gt; &quot; &#39;',
  )
})

test('renders supported primitive and unsafe values', async () => {
  const error = new Error('failed')

  await expect(renderAsString(html`${42}|${error}|${new UnSafeHTML('<strong>ok</strong>')}`)).resolves.toBe(
    '42|Error: failed|<strong>ok</strong>',
  )
})

test('renders arrays and iterables', async () => {
  function* items() {
    yield 'from generator'
    yield '<escaped>'
  }

  await expect(renderAsString(html`<ul>${['<one>', ['two']]}${items()}</ul>`)).resolves.toBe(
    '<ul>&lt;one&gt;twofrom generator<escaped></ul>',
  )
})

test('renders asynchronous values and omits undefined values', async () => {
  const value = Promise.resolve('<async>')

  await expect(renderAsString(html`before${value}${undefined}after`)).resolves.toBe(
    'before&lt;async&gt;after',
  )
})

test('renders rejected promises as errors', async () => {
  await expect(renderAsString(html`before ${Promise.reject(new Error('failed'))} after`)).resolves.toBe(
    'before Error: failed after',
  )
})

test('renders nested asynchronous arrays', async () => {
  const value = Promise.resolve(['<one>', [new UnSafeHTML('<strong>two</strong>'), 'three']])

  await expect(renderAsString(html`<section>${value}</section>`)).resolves.toBe(
    '<section>&lt;one&gt;<strong>two</strong>three</section>',
  )
})

test('renders a response body as part of a template', async () => {
  const response = new Response('streamed')

  await expect(renderAsString(html`before ${response} after`)).resolves.toBe('before streamed after')
})

test('renders a readable stream as part of a template', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('first ')
      controller.enqueue('second')
      controller.close()
    },
  })

  await expect(renderAsString(html`before ${stream} after`)).resolves.toBe('before first second after')
})

test('reuses cached templates with different values', async () => {
  function greeting(name: string) {
    return html`<p>Hello ${name}</p>`
  }

  await expect(renderAsString(greeting('Ada'))).resolves.toBe('<p>Hello Ada</p>')
  await expect(renderAsString(greeting('Grace'))).resolves.toBe('<p>Hello Grace</p>')
})

test('liveHTML yields template chunks and deferred values', () => {
  const pending = Promise.resolve('later')
  const chunks = [...liveHTML`<p>${'&'}${['<item>']}${pending}</p>`]

  expect(chunks).toEqual(['<p>&amp;', '&lt;item&gt;', pending, '</p>'])
})

test('render creates an HTML response with defaults and custom options', async () => {
  const response = render(html`<h1>ok</h1>`, { 'X-Test': 'yes' }, 201, 'Created')

  expect(response.status).toBe(201)
  expect(response.statusText).toBe('Created')
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  expect(response.headers.get('X-Test')).toBe('yes')
  await expect(response.text()).resolves.toBe('<h1>ok</h1>')
})

