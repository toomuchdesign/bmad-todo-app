import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().notNull(),
  title: text("title").notNull(),
  text: text("text"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});
