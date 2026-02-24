import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/worker"
import { createCandidateEvaluationWorker } from "@packages/queue"
import { evaluateCandidateJob } from "@/lib/evaluate-candidate"

getSafeEnv(env, "@worker/bullmq")
const llmRateLimitPerMinute = Number(process.env.LLM_RATE_LIMIT_PER_MINUTE ?? "30")
const llmMaxRetries = Number(process.env.LLM_MAX_RETRIES ?? "2")

const worker = createCandidateEvaluationWorker(
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
    limiter: {
      max: llmRateLimitPerMinute,
      duration: 60_000,
    },
  },
)

worker.on("ready", () => {
  console.info("[worker] candidate-evaluation worker ready")
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
