import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/worker"
import { createCandidateEvaluationBrowserWorker, createCandidateEvaluationFetchWorker } from "@packages/queue"
import { evaluateCandidateJob } from "@/lib/evaluate-candidate"

getSafeEnv(env, "@worker/bullmq")

if (!env.REDIS_URL) {
  console.error("[worker] REDIS_URL is not configured - worker cannot start")
  process.exit(1)
}

const llmRateLimitPerMinute = Number(process.env.LLM_RATE_LIMIT_PER_MINUTE ?? "30")
const llmMaxRetries = Number(process.env.LLM_MAX_RETRIES ?? "2")

let worker: ReturnType<typeof createCandidateEvaluationFetchWorker>

const createWorkerForType = env.WORKER_TYPE === "browser"
  ? createCandidateEvaluationBrowserWorker
  : createCandidateEvaluationFetchWorker

try {
  worker = createWorkerForType(
    env.REDIS_URL,
    async (job) => {
      console.info(
        `[worker] evaluate candidate applicationId=${job.data.applicationId} jobId=${job.data.jobId} orgId=${job.data.organizationId}`,
      )
      await evaluateCandidateJob(
        {
          applicationId: job.data.applicationId,
          organizationId: job.data.organizationId,
          jobId: job.data.jobId,
        },
        {
          sarvamApiKey: env.SARVAM_API_KEY,
          githubToken: env.GITHUB_TOKEN,
          enableEvidenceScraping: env.ENABLE_EVIDENCE_SCRAPING,
          llmMaxRetries,
        },
      )
    },
    {
      concurrency: env.WORKER_CONCURRENCY,
      lockDuration: 300_000,
      lockRenewTime: 30_000,
      limiter: {
        max: llmRateLimitPerMinute,
        duration: 60_000,
      },
    },
  )
} catch (error) {
  console.error(`[worker] Failed to create ${env.WORKER_TYPE} candidate evaluation worker:`, error)
  process.exit(1)
}

worker.on("ready", () => {
  console.info(`[worker] candidate-evaluation ${env.WORKER_TYPE} worker ready`)
})

worker.on("completed", (job) => {
  console.info(`[worker] completed job id=${job.id}`)
})

worker.on("failed", (job, err) => {
  const jobId = job?.id ?? "unknown"
  console.error(`[worker] failed job id=${jobId}`, err)
})

const shutdown = async () => {
  await worker.close()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
