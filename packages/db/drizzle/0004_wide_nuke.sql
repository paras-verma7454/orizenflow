DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'jobs'
			AND column_name = 'is_remote'
	) THEN
		ALTER TABLE "jobs" RENAME COLUMN "is_remote" TO "job_type";
	END IF;
END $$;