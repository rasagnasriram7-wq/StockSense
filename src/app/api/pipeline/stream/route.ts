import { NextRequest } from 'next/server';
import { pipelineEmitter, getRecentPipelineEvents, PipelineEvent } from '@/lib/pipeline-events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial handshake and recent buffered events
      const sendEvent = (event: PipelineEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // stream might be closed
        }
      };

      const handshakeEvent: PipelineEvent = {
        id: `init-${Date.now()}`,
        type: 'heartbeat',
        stage: 'system',
        title: 'Pipeline Stream Connected',
        message: 'Real-time telemetry stream established with StockSense core ledger.',
        timestamp: new Date().toISOString(),
      };
      sendEvent(handshakeEvent);

      // Send recent historical events so stream isn't empty upon initial connect
      const historical = getRecentPipelineEvents();
      historical.slice(0, 10).reverse().forEach((evt) => {
        sendEvent(evt);
      });

      // 2. Listen to real-time events from emitter
      const onPipelineEvent = (event: PipelineEvent) => {
        sendEvent(event);
      };

      pipelineEmitter.on('pipeline_event', onPipelineEvent);

      // 3. Send periodic heartbeat every 15 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        const hb: PipelineEvent = {
          id: `hb-${Date.now()}`,
          type: 'heartbeat',
          stage: 'system',
          title: 'Pipeline Stream Heartbeat',
          message: 'Connection active. Telemetry healthy.',
          timestamp: new Date().toISOString(),
        };
        sendEvent(hb);
      }, 15000);

      // 4. Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        pipelineEmitter.off('pipeline_event', onPipelineEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
