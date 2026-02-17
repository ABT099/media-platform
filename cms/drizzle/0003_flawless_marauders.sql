CREATE TYPE "public"."status" AS ENUM('draft', 'scheduled', 'published');--> statement-breakpoint
ALTER TABLE "episodes" RENAME COLUMN "media_url" TO "video_url";--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "status" "status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
CREATE INDEX "episodes_status_idx" ON "episodes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "episodes_publication_date_idx" ON "episodes" USING btree ("publication_date");--> statement-breakpoint
CREATE INDEX "episodes_status_publication_date_idx" ON "episodes" USING btree ("status","publication_date");