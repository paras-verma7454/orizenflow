import { Queue, Worker, type ConnectionOptions, type Processor, type WorkerOptions } from "bullmq"

export const CANDIDATE_EVALUATION_QUEUE_NAME = "candidate-evaluation"

export type CandidateEvaluationJobData = {
  applicationId: string
  organizationId: string
  jobId: string
  enqueuedAt: string
}

const toConnectionOptions = (redisUrl: string): ConnectionOptions => {
  const url = new URL(redisUrl)
  const db = Number(url.pathname.replace("/", "") || "0")

  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isNaN(db) ? 0 : db,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  }
}

export const createCandidateEvaluationQueue = (redisUrl: string) => {
  return new Queue<CandidateEvaluationJobData>(CANDIDATE_EVALUATION_QUEUE_NAME, {
    connection: toConnectionOptions(redisUrl),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
    },
  })
}

export const createCandidateEvaluationWorker = (
  redisUrl: string,
  processor: Processor<CandidateEvaluationJobData>,
  options?: Omit<WorkerOptions, "connection">,
) => {
  return new Worker<CandidateEvaluationJobData>(
    CANDIDATE_EVALUATION_QUEUE_NAME,
    processor,
    {
      connection: toConnectionOptions(redisUrl),
      ...options,
    },
  )
}
