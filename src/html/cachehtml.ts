import { escapeHTML } from "../utils/escapehtml";
import { sanitizeArray } from "../utils/sanitizeArray";
import { UnSafeHTML } from "../utils/UnSafeHTML";

type GeneratorFunctionConstructor = new (
  ...args: string[]
) => (...args: any[]) => Generator<any, any, any>;
const TemplateConstructor = function* () {}
    .constructor as GeneratorFunctionConstructor,
  templateCache = new WeakMap();

/**
 * A function that generates the source code for a compiled HTML template function.
 *
 * @param {String[]} templates
 * @param {Array} values
 * @returns {string} source code of the compiled template function that can be called with the appropriate arguments to produce the final HTML output based on the provided templates and values.
 */
function generateTemplateSourceCode(
  templates: TemplateStringsArray,
  values: TemplateValues[],
): string {
  let sourceCode = `yield \`${templates[0]}\``,
    length = values.length;
  for (let index = 0; index < length; index++) {
    let value = values[index];
    if (typeof value == "string") {
      sourceCode += `+escapeHTML(args[${index}])+\`${templates[index + 1]}\``;
    } else if (value instanceof UnSafeHTML) {
      sourceCode += `+args[${index}].html+\`${templates[index + 1]}\``;
    } else if (value instanceof Error || typeof value == "number") {
      sourceCode += `+args[${index}]+\`${templates[index + 1]}\``;
    } else if (Array.isArray(value)) {
      sourceCode += `; yield * sanitizeArray(args[${index}]); yield \`${templates[index + 1]}\``;
    } else if ((value as any)?.[Symbol.iterator]) {
      sourceCode += `; yield * args[${index}]; yield \`${templates[index + 1]}\``;
    } else {
      sourceCode += `; yield args[${index}]; yield \`${templates[index + 1]}\``;
    }
  }
  return sourceCode;
}
/**
 * compiles an HTML template into a function that can be cached and reused with different values. It generates source code for the template by processing the provided templates and values, handling various types of values such as strings, UnSafeHTML instances, errors, numbers, arrays, and iterables. The generated source code is then used to create a new function using the TemplateConstructor, which can be called with the appropriate arguments to produce the final HTML output. This approach allows for efficient rendering of HTML templates while ensuring that string values are properly escaped to prevent XSS vulnerabilities.
 *
 * @param {String[]} templates
 * @param {Array} values
 * @returns {GeneratorFunction} A generator function that can be called with the appropriate arguments to produce the final HTML output based on the provided templates and values.
 */
function compileTemplate(
  templates: TemplateStringsArray,
  values: TemplateValues[],
) {
  let sourceCode = generateTemplateSourceCode(templates, values);
  return new TemplateConstructor(
    "escapeHTML",
    "sanitizeArray",
    "args",
    sourceCode,
  );
}
/**
 * A function that renders an HTML template with caching capabilities. It checks if a compiled template function already exists in the cache for the given templates. If it does, it calls the cached function with the provided values and returns the result. If not, it compiles a new template function using the compileTemplate function, stores it in the cache, and then calls it with the provided values. This allows for efficient rendering of HTML templates while ensuring that string values are properly escaped to prevent XSS vulnerabilities.
 *
 * @param {String[]} templates
 * @param {...(String|UnSafeHTML|Error|number|Array|Iterable)} values
 * @returns {GeneratorFunction} A generator function that can be called with the appropriate arguments to produce the final HTML output based on the provided templates and values.
 */
function cachableHTML(
  templates: TemplateStringsArray,
  ...values: TemplateValues[]
) {
  let template = templateCache.get(templates);
  if (template) {
    return template(escapeHTML, sanitizeArray, values);
  }
  template = compileTemplate(templates, values);
  templateCache.set(templates, template);
  return template(escapeHTML, sanitizeArray, values);
}

export { cachableHTML };
