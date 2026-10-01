export class UnSafeHTML {
  public html: string;
  /**
   * Creates unsafe html that will not be escaped
   *
   * @param {string} html - string containing unsafe html
   */
  constructor(html: string) {
    this.html = html;
  }
}
