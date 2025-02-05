import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  image: text("image").notNull(),
  location: text("location").notNull(),
  lastWatered: timestamp("last_watered"),
  wateringInterval: integer("watering_interval").notNull(), // days
  lastFertilized: timestamp("last_fertilized"),
  fertilizingInterval: integer("fertilizing_interval").notNull(), // days
  sunlight: text("sunlight").notNull(), // enum: low, medium, high
  notes: text("notes"),
});

export const insertPlantSchema = createInsertSchema(plants)
  .omit({ id: true, lastWatered: true, lastFertilized: true })
  .extend({
    name: z.string().min(1, "Name is required"),
    species: z.string().min(1, "Species is required"),
    wateringInterval: z.number().min(1, "Must water at least once per day"),
    fertilizingInterval: z.number().min(1, "Must fertilize at least once per day"),
    sunlight: z.enum(["low", "medium", "high"]),
  });

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;

export const careTasks = pgTable("care_tasks", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  type: text("type").notNull(), // water, fertilize
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const insertCareTaskSchema = createInsertSchema(careTasks)
  .omit({ id: true })
  .extend({
    type: z.enum(["water", "fertilize"]),
  });

export type CareTask = typeof careTasks.$inferSelect;
export type InsertCareTask = z.infer<typeof insertCareTaskSchema>;
