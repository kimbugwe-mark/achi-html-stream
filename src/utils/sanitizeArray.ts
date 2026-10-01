import { escapeHTML } from "./escapehtml";

export function sanitizeArray(values: any[]): any[] {
  let index = values.length;
  while (index--) {
    let value = values[index];
    if (typeof value == "string") {
      values[index] = escapeHTML(value);
    }
  }
  return values;
}
