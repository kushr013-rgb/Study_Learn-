import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { config } from './config';
import { redis } from './lib/redis';

const worker = new Worker('assessment-jobs', async (job) => {
  if (job.name === 'process-result') {
    // Result generation is deliberately idempotent: the attempt document is the
    // source of truth and the job id is derived from its stable id.
    console.log(JSON.stringify({ event: 'result.processed', attemptId: job.data.attemptId }));
  }
}, {
  connection: { url: config.redisUrl },
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 10),
});

worker.on('failed', (job, error) => console.error(JSON.stringify({ event: 'job.failed', jobId: job?.id, error: error.message })));

async function shutdown() {
  await worker.close();
  await redis.quit();
  await mongoose.disconnect();
  process.exit(0);
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
console.log('Assessment worker started.');
