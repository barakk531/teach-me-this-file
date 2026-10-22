const HEARTBEAT_MS = 15_000;

/**
 * Opens a Server-Sent Events response. The returned `signal` aborts when the
 * client disconnects (for example when the student presses Stop), so the AI
 * call can be cancelled instead of running and costing tokens for nothing.
 */
export function openEventStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const disconnect = new AbortController();
  // Comment lines keep proxies from closing a quiet connection during long AI calls.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  res.on('close', () => {
    clearInterval(heartbeat);
    if (!res.writableFinished) disconnect.abort();
  });

  return {
    signal: disconnect.signal,
    send(event, data) {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    },
  };
}
