import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/lib/utils"
import { NODE_ENV } from "@/lib/constants"

export const env = createEnv({
  server: {
    NODE_ENV,
    REDIS_URL: z.url().default("redis://localhost:6379"),
    WORKER_CONCURRENCY: z.coerce.number().default(2),
    SARVAM_API_KEY: z.string().min(1),
    GITHUB_TOKEN: z.string().min(1).optional(),
    ENABLE_EVIDENCE_SCRAPING: z.coerce.boolean().default(true),
    LLM_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(30),
    LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    REDIS_URL: process.env.REDIS_URL,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
    SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    ENABLE_EVIDENCE_SCRAPING: process.env.ENABLE_EVIDENCE_SCRAPING,
    LLM_RATE_LIMIT_PER_MINUTE: process.env.LLM_RATE_LIMIT_PER_MINUTE,
    LLM_MAX_RETRIES: process.env.LLM_MAX_RETRIES,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
})
