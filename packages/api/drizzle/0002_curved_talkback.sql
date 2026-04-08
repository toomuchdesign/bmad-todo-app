CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);

-- Seed the default user
INSERT INTO users (id, name, created_at, updated_at)
VALUES ('00000000-0000-4000-8000-000000000001', 'Default User', NOW(), NOW());
