ALTER TABLE "CRUSHER"."delivery_slip" ALTER COLUMN "royalty_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CRUSHER"."delivery_slip" ALTER COLUMN "royalty_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CRUSHER"."delivery_slip" ALTER COLUMN "royalty_quantity_unit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CRUSHER"."delivery_slip" ALTER COLUMN "product_quantity" SET NOT NULL;