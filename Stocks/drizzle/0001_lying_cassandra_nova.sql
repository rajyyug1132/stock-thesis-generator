CREATE TYPE "public"."api_key_tier" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"name" text NOT NULL,
	"tier" "api_key_tier" DEFAULT 'free' NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
