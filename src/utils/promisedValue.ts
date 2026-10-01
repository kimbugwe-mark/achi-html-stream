export async function promisedValue(value: Promise<any>): Promise<any> {
  try {
    return await value;
  } catch (error) {
    if (error instanceof Promise) {
      return promisedValue(error);
    } else {
      return error;
    }
  }
}
