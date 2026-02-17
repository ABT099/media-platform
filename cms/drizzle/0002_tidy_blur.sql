CREATE TYPE "public"."language_code" AS ENUM('ar', 'en');--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "publication_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ALTER COLUMN "language" SET DATA TYPE "public"."language_code" USING "language"::"public"."language_code";--> statement-breakpoint
ALTER TABLE "programs" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "episodes_program_id_idx" ON "episodes" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_episode_per_season" ON "episodes" USING btree ("program_id","season_number","episode_number");--> statement-breakpoint
CREATE INDEX "programs_category_idx" ON "programs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "programs_type_idx" ON "programs" USING btree ("type");