CREATE TYPE "CRUSHER"."bill_item_type" AS ENUM('product', 'charge');--> statement-breakpoint
CREATE TYPE "CRUSHER"."delivery_slip_state" AS ENUM('pending', 'billed', 'discarded');--> statement-breakpoint
CREATE TYPE "CRUSHER"."import_row_status" AS ENUM('pending', 'approved', 'skipped', 'saved', 'discarded', 'duplicate');--> statement-breakpoint
CREATE TYPE "CRUSHER"."import_session_status" AS ENUM('mapping', 'processing', 'reviewing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "CRUSHER"."bill" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"party_id" uuid NOT NULL,
	"date_start" date NOT NULL,
	"date_end" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CRUSHER"."bill_item" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"bill_id" uuid NOT NULL,
	"type" "CRUSHER"."bill_item_type" NOT NULL,
	"description" text,
	"delivery_slip_id" uuid,
	"product_id" uuid,
	"quantity" numeric(10, 2),
	"unit" text,
	"rate" numeric(10, 2),
	"amount" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CRUSHER"."customer" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CRUSHER"."delivery_slip" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"date" date NOT NULL,
	"party_id" uuid,
	"vehicle_id" uuid,
	"royalty_number" text,
	"royalty_quantity" numeric(10, 2),
	"royalty_quantity_unit" text,
	"product_id" uuid,
	"product_quantity" numeric(10, 2) NOT NULL,
	"product_quantity_unit" text NOT NULL,
	"state" "CRUSHER"."delivery_slip_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "CRUSHER"."product" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CRUSHER"."receipt" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"party_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CRUSHER"."vehicle" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"number_plate" text NOT NULL,
	"vehicle_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CRUSHER"."bill" ADD CONSTRAINT "bill_party_id_customer_id_fk" FOREIGN KEY ("party_id") REFERENCES "CRUSHER"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."bill_item" ADD CONSTRAINT "bill_item_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "CRUSHER"."bill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."bill_item" ADD CONSTRAINT "bill_item_delivery_slip_id_delivery_slip_id_fk" FOREIGN KEY ("delivery_slip_id") REFERENCES "CRUSHER"."delivery_slip"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."bill_item" ADD CONSTRAINT "bill_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "CRUSHER"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."delivery_slip" ADD CONSTRAINT "delivery_slip_party_id_customer_id_fk" FOREIGN KEY ("party_id") REFERENCES "CRUSHER"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."delivery_slip" ADD CONSTRAINT "delivery_slip_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "CRUSHER"."vehicle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."delivery_slip" ADD CONSTRAINT "delivery_slip_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "CRUSHER"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."import_row" ADD CONSTRAINT "import_row_session_id_import_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "CRUSHER"."import_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CRUSHER"."receipt" ADD CONSTRAINT "receipt_party_id_customer_id_fk" FOREIGN KEY ("party_id") REFERENCES "CRUSHER"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_slip_date_desc_created_at_desc_id_desc_idx" ON "CRUSHER"."delivery_slip" USING btree ("date" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "import_row_session_id_status_idx" ON "CRUSHER"."import_row" USING btree ("session_id","status");