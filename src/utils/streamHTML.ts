export async function streamHTML(
  readable: ReadableStream<string>,
  controller: ReadableStreamDefaultController,
) {
  const stream: ReadableStreamDefaultReader = readable.getReader();
  try {
    while (true) {
      let data = await stream.read();
      if (data.done) {
        return;
      }
      controller.enqueue(data.value);
    }
  } catch (error) {
    controller.enqueue(error);
  } finally {
    stream.releaseLock();
  }
}
