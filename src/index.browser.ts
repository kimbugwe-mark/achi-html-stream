import { cachableHTML } from "./html/cachehtml";
import { liveHTML } from "./html/livehtml";
import { UnSafeHTML } from "./utils/UnSafeHTML";
import { renderStream, renderAsString } from "./html/html";
import { escapeHTML } from "./utils/escapehtml";

/**
 * Renders an HTML template and sends it as a response
 *
 * @param {HTMLTemplate} template - HTML template to render
 * @param {{}} [headers={}] - Headers to send with the response
 * @param {number} [status=200] - HTTP status code
 * @param {string} [statusText='OK'] - HTTP status text
 * @returns {Response} - The rendered HTML response
 */
function render(
  template: Generator,
  headers = {},
  status = 200,
  statusText = "OK",
): Response {
  let responseHeaders = Object.assign(
    { "Content-Type": "text/html; charset=utf-8" },
    headers,
  );
  return new Response(
    renderStream(template).pipeThrough(new TextEncoderStream()),
    { headers: responseHeaders, status, statusText },
  );
}
export {
  render,
  renderAsString,
  renderStream,
  liveHTML,
  cachableHTML as html,
  UnSafeHTML,
  escapeHTML,
};
