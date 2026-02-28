CREATE TYPE "CRUSHER"."bill_item_type" AS ENUM('product', 'charge');--> statement-breakpoint
CREATE TYPE "CRUSHER"."delivery_slip_state" AS ENUM('pending', 'billed', 'discarded');--> statement-breakpoint
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
	"external_id" text NOT NULL,
	"date" date NOT NULL,
	"party_id" uuid,
	"vehicle_id" uuid,
	"royalty_number" text NOT NULL,
	"royalty_quantity" numeric(10, 2) NOT NULL,
	"royalty_quantity_unit" text NOT NULL,
	"product_id" uuid,
	"product_quantity" numeric(10, 2),
	"product_quantity_unit" text NOT NULL,
	"state" "CRUSHER"."delivery_slip_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "delivery_slip_external_id_unique" UNIQUE("external_id")
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
ALTER TABLE "CRUSHER"."receipt" ADD CONSTRAINT "receipt_party_id_customer_id_fk" FOREIGN KEY ("party_id") REFERENCES "CRUSHER"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_slip_created_at_desc_id_desc_idx" ON "CRUSHER"."delivery_slip" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);