import { EventEmitter } from 'events';

export interface PipelineEvent {
  id: string;
  type: 'receipt' | 'delivery' | 'internal' | 'adjustment' | 'status_change' | 'low_stock' | 'heartbeat';
  stage: 'inbound' | 'staging' | 'internal' | 'picking' | 'outbound' | 'variance' | 'system';
  title: string;
  message: string;
  documentNumber?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  uom?: string;
  fromLocation?: string;
  toLocation?: string;
  user?: string;
  timestamp: string;
  status?: string;
}

class PipelineEventEmitter extends EventEmitter {}

// Global singleton across Next.js reloads
const globalForPipeline = global as unknown as { pipelineEmitter?: PipelineEventEmitter };

export const pipelineEmitter = globalForPipeline.pipelineEmitter || new PipelineEventEmitter();
pipelineEmitter.setMaxListeners(100);

if (process.env.NODE_ENV !== 'production') {
  globalForPipeline.pipelineEmitter = pipelineEmitter;
}

// In-memory buffer of recent pipeline events (keeps last 50 events)
const recentEvents: PipelineEvent[] = [];

export function broadcastPipelineEvent(event: Omit<PipelineEvent, 'id' | 'timestamp'>) {
  const fullEvent: PipelineEvent = {
    ...event,
    id: `pipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  recentEvents.unshift(fullEvent);
  if (recentEvents.length > 50) recentEvents.pop();

  pipelineEmitter.emit('pipeline_event', fullEvent);
  return fullEvent;
}

export function getRecentPipelineEvents(): PipelineEvent[] {
  return [...recentEvents];
}
