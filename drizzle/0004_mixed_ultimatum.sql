CREATE TYPE "CRUSHER"."import_row_status" AS ENUM('pending', 'approved', 'skipped', 'saved', 'discarded', 'duplicate');--> statement-breakpoint
CREATE TYPE "CRUSHER"."import_session_status" AS ENUM('mapping', 'processing', 'reviewing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "CRUSHER"."import_row" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"session_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"raw_data" jsonb NOT NULL,
	"mapped_data" jsonb,
	"hash" text,
	"status" "CRUSHER"."import_row_status" DEFAULT 'pending' NOT NULL,
	"issues" jsonb,
	"matched_party_id" uuid,
	"matched_vehicle_id" uuid,
	"matched_product_id" uuid,
	"match_confidence" jsonb,
	"new_party_name" text,
	"new_vehicle_number" text,
	"new_product_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CRUSHER"."import_session" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"file_name" text NOT NULL,
	"status" "CRUSHER"."import_session_status" DEFAULT 'mapping' NOT NULL,
	"column_mapping" jsonb,
	"stats" jsonb,
	"raw_headers" jsonb,
	"suggested_mapping" jsonb,
	"sample_rows" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CRUSHER"."import_row" ADD CONSTRAINT "import_row_session_id_import_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "CRUSHER"."import_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_row_session_id_status_idx" ON "CRUSHER"."import_row" USING btree ("session_id","status");