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
  position: text("position"), // Add position column to store JSON string of x,y coordinates
});

export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  healthScore: integer("health_score").notNull(), // 1-5 scale
  issues: text("issues").array(), // Array of issues like ["yellow_leaves", "drooping"]
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
    position: z.string().optional(),
  });

export const insertHealthRecordSchema = createInsertSchema(healthRecords)
  .omit({ id: true })
  .extend({
    healthScore: z.number().min(1).max(5),
    issues: z.array(z.string()),
  });

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type CareTask = typeof careTasks.$inferSelect;
export type InsertCareTask = z.infer<typeof insertCareTaskSchema>;

export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;

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