ALTER TABLE "todos" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "todos" SET "user_id" = '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "todos" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
