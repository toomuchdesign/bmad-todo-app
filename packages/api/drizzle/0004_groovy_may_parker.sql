-- Add auth columns to users table.
-- Backfill the default seeded user (seed@example.com / seedpassword) before applying NOT NULL.
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
UPDATE "users" SET "email" = 'seed@example.com', "password_hash" = '$argon2id$v=19$m=65536,t=3,p=4$JewBwBTQcCq2hZWJ5sVBeQ$V+/k0iWEbXOoTh2on3gJhYY9ehZtAl2FgVN0jT9iohE' WHERE "id" = '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
