import { UnSafeHTML } from "../utils/UnSafeHTML";
import { escapeHTML } from "../utils/escapehtml";
import { sanitizeArray } from "../utils/sanitizeArray";

/**
 * A generator function that processes an HTML template without caching. It handles various types of values, including strings, UnSafeHTML instances, errors, numbers, promises, arrays, and iterables. The function ensures that string values are properly escaped to prevent XSS vulnerabilities, while allowing UnSafeHTML instances to be included as-is. It also supports asynchronous values by yielding promises and waiting for their resolution before processing them further.
 *
 * @export
 * @param {String[]} templates
 * @param {...TemplateValues} values
 * @returns {Generator} A generator that yields processed HTML content as a stream.
 */
export function* liveHTML(
  templates: TemplateStringsArray,
  ...values: TemplateValues[]
) {
  let cache = templates[0],
    length = values.length;
  for (let index = 0; index < length; index++) {
    let value = values[index];
    if (typeof value == "string") {
      cache += escapeHTML(value);
    } else if (value instanceof UnSafeHTML) {
      cache += value.html;
    } else if (value instanceof Error || typeof value == "number") {
      cache += value;
    } else if (Array.isArray(value)) {
      if (cache) {
        yield cache;
        cache = "";
      }
      yield* sanitizeArray(value);
    } else if ((value as any)?.[Symbol.iterator]) {
      if (cache) {
        yield cache;
        cache = "";
      }
      yield* value as Generator;
    } else {
      yield value;
    }
    cache += templates[index + 1];
  }
  if (cache) {
    yield cache;
    cache = "";
  }
}
