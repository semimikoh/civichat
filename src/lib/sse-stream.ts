const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

export function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function createSseResponse(
  handler: (enqueue: (data: string) => void, isCancelled: () => boolean) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(data));
      };

      try {
        await handler(enqueue, () => cancelled);
        if (!cancelled) controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
