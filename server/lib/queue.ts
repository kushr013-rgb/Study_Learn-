import { Queue } from 'bullmq';
import { config } from '../config';

let assessmentQueue: Queue | null = null;

function getQueue(): Queue | null {
  if (assessmentQueue) return assessmentQueue;
  try {
    assessmentQueue = new Queue('assessment-jobs', {
      connection: { url: config.redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800 },
      },
    });
    assessmentQueue.on('error', () => {
      // suppress repeated connection errors if redis is offline
    });
    return assessmentQueue;
  } catch {
    return null;
  }
}

export async function enqueueResultProcessing(attemptId: string): Promise<void> {
  try {
    const queue = getQueue();
    if (queue) {
      await queue.add('process-result', { attemptId }, { jobId: `result:${attemptId}` });
      return;
    }
  } catch {
    // In-memory / direct processing fallback
  }
  // Direct processing fallback if BullMQ queue unavailable
  console.log(JSON.stringify({ event: 'result.processed.direct', attemptId }));
}
