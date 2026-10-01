import { cachableHTML } from "./html/cachehtml";
import { liveHTML } from "./html/livehtml";
import { UnSafeHTML } from "./utils/UnSafeHTML";
import { renderStream, renderAsString } from "./html/html";
import { escapeHTML } from "./utils/escapehtml";
import { Readable } from "node:stream";

/**
 * Renders an HTML template and sends it as a response
 *
 * @param {response} response - Node response object
 * @param {HTMLTemplate} template - HTML template to render
 * @param {{}} [headers={}] - Headers to send with the response
 * @param {number} [status=200] - HTTP status code
 * @param {string} [statusText='OK'] - HTTP status text
 * @returns {void}
 */
function render(
  response: any,
  template: Generator,
  headers = {},
  status = 200,
  statusText = "OK",
) {
  const readable = Readable.fromWeb(renderStream(template));
  response.writeHead(
    status,
    statusText,
    Object.assign({ "Content-Type": "text/html; charset=utf-8" }, headers),
  );
  readable.pipe(response);
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
