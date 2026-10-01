import { UnSafeHTML } from "../utils/UnSafeHTML";
import { escapeHTML } from "../utils/escapehtml";
import { sanitizeArray } from "../utils/sanitizeArray";
import { promisedValue } from "../utils/promisedValue";
import { streamHTML } from "../utils/streamHTML";

/**
 * A generator function that processes an HTML template with embedded values and yields the resulting HTML as a stream. It handles various types of values, including strings, UnSafeHTML instances, errors, numbers, promises, arrays, and iterables. The function ensures that string values are properly escaped to prevent XSS vulnerabilities, while allowing UnSafeHTML instances to be included as-is. It also supports asynchronous values by yielding promises and waiting for their resolution before processing them further.
 *
 * @param {Generator} templateGenerator
 * @param {ReadableStreamDefaultController} controller
 * @returns {IterableIterator<string>} An iterator that yields the resulting HTML as a stream.
 */
function* processHTML(
  templateGenerator: Generator | Array<TemplateValues>,
  controller: ReadableStreamDefaultController<string>,
): any {
  let cache: string = "";
  for (const value of templateGenerator) {
    if (typeof value == "string") {
      cache += value;
    } else if (value instanceof UnSafeHTML) {
      cache += value.html;
    } else if (value instanceof Error || typeof value == "number") {
      cache += value;
    } else if (value instanceof Promise) {
      if (cache) {
        controller.enqueue(cache);
        cache = "";
      }
      let resolvedValue = yield value;
      if (typeof resolvedValue == "string") {
        cache += escapeHTML(resolvedValue);
      } else if (resolvedValue instanceof UnSafeHTML) {
        cache += resolvedValue.html;
      } else if (
        resolvedValue instanceof Error ||
        typeof resolvedValue == "number"
      ) {
        cache += resolvedValue;
      } else if (Array.isArray(resolvedValue)) {
        if (cache) {
          controller.enqueue(cache);
          cache = "";
        }
        yield* processHTML(sanitizeArray(resolvedValue), controller);
      } else if (resolvedValue?.[Symbol.iterator]) {
        if (cache) {
          controller.enqueue(cache);
          cache = "";
        }
        yield* processHTML(resolvedValue, controller);
      } else if (resolvedValue == undefined) {
        continue;
      } else {
        if (cache) {
          controller.enqueue(cache);
          cache = "";
        }
        let resolvedValues = yield resolvedValue;
        void resolvedValues
      }
    } else if (Array.isArray(value)) {
      if (cache) {
        controller.enqueue(cache);
        cache = "";
      }
      yield* processHTML(sanitizeArray(value), controller);
    } else if (value?.[Symbol.iterator]) {
      if (cache) {
        controller.enqueue(cache);
        cache = "";
      }
      yield* processHTML(value, controller);
    } else if (value == undefined) {
      continue;
    } else {
      if (cache) {
        controller.enqueue(cache);
        cache = "";
      }
      let resolvedValue = yield value;
      void resolvedValue
    }
  }
  if (cache) {
    controller.enqueue(cache);
    cache = "";
  }
}

/**
 * A function that renders an HTML template generator and returns a ReadableStream that yields the resulting HTML as a stream. It uses the processHTML generator function to process the template and handle various types of values, including promises and streams, while ensuring that string values are properly escaped to prevent XSS vulnerabilities.
 *
 * @param {Generator} generator - The HTML template generator to render.
 * @returns {ReadableStream} A ReadableStream that yields the resulting HTML as a stream.
 */
function renderStream(generator: Generator) {
  return new ReadableStream<string>({
    start(controller) {
      let templateGenerator = processHTML(generator, controller);
      return startHTMLStream(templateGenerator);
      async function startHTMLStream(
        value:
          | undefined
          | Promise<any>
          | Request
          | ReadableStream
          | Response = undefined,
      ) {
        let data = templateGenerator.next(value);
        try {
          if (data.value instanceof Promise) {
            let resolvedValue = await promisedValue(data.value);
            return startHTMLStream(resolvedValue);
          } else if (data.value instanceof Response) {
            await streamHTML(data.value.body.pipeThrough(new TextDecoderStream()), controller);
            return startHTMLStream();
          } else if (data.value instanceof ReadableStream) {
            await streamHTML(data.value, controller);
            return startHTMLStream();
          } else if (data.value instanceof Request) {
            let response:Response = await fetch(data.value),
              stream = response.body;
            if (stream) {
              await streamHTML(stream.pipeThrough(new TextDecoderStream()), controller);
            }
            return startHTMLStream();
          }
        } catch (error) {
          controller.enqueue(error as string);
          return startHTMLStream();
        }
        controller.close();
      }
    },
  });
}
/**
 * renders an HTML template generator and returns a promise that resolves to the resulting HTML as a string.
 *
 * @async
 * @param {Generator} generator
 * @returns {Promise<string>} A promise that resolves to the resulting HTML as a string.
 */
async function renderAsString(generator: Generator): Promise<string> {
  try {
    let readable = renderStream(generator).getReader(),
      html = "";
    while (true) {
      let data = await readable.read();
      if (data.done) {
        readable.releaseLock();
        break;
      }
      html += data.value;
    }
    return html;
  } catch (error) {
    throw error;
  }
}
export { renderStream, renderAsString };
