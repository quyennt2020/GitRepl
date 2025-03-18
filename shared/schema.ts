import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
  position: text("position"), // Store JSON string of x,y coordinates
});

// New table for task templates
export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // water, fertilize, prune, check, etc.
  description: text("description"),
  defaultInterval: integer("default_interval").notNull().default(7), // Default interval in days
  priority: text("priority").notNull(), // high, medium, low
  estimatedDuration: integer("estimated_duration"), // in minutes
  requiresExpertise: boolean("requires_expertise").default(false),
  public: boolean("public").default(false),
  applyToAll: boolean("apply_to_all").default(false),
  metadata: jsonb("metadata"), // For flexible additional fields
  isOneTime: boolean("is_one_time").default(false), // New field for one-time tasks
});

// New table for checklist items within task templates
export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull(),
  required: boolean("required").default(true),
});

export const careTasks = pgTable("care_tasks", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  templateId: integer("template_id").notNull(), // Reference to task template
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  checklistProgress: jsonb("checklist_progress"), // Store completion status of checklist items
});

export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  healthScore: integer("health_score").notNull(), // 1-5 scale
  mood: text("mood").notNull(), // Add mood field for emoji
  issues: text("issues").array(), // Array of issues like ["yellow_leaves", "drooping"]
  notes: text("notes"),
});

// Zod schemas for task templates
export const insertTaskTemplateSchema = createInsertSchema(taskTemplates)
  .omit({ id: true })
  .extend({
    category: z.enum(["water", "fertilize", "prune", "check", "repot", "clean"]),
    priority: z.enum(["high", "medium", "low"]),
    defaultInterval: z.number().min(1, "Interval must be at least 1 day").default(7),
    isOneTime: z.boolean().default(false),
    metadata: z.record(z.unknown()).optional(),
    public: z.boolean().default(false),
    applyToAll: z.boolean().default(false),
  });

// Zod schema for checklist items
export const insertChecklistItemSchema = createInsertSchema(checklistItems)
  .omit({ id: true });

// Update care task schema to include template and checklist progress
export const insertCareTaskSchema = createInsertSchema(careTasks)
  .omit({ id: true, completedAt: true })
  .extend({
    checklistProgress: z.record(z.boolean()).optional(),
    templateId: z.coerce.number({
      required_error: "Please select a task type",
      invalid_type_error: "Task type must be a number"
    }).positive("Please select a valid task type"),
    dueDate: z.coerce.date({
      required_error: "Due date is required",
      invalid_type_error: "Invalid date format"
    }),
    plantId: z.coerce.number().positive(),
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
    mood: z.enum(['thriving', 'happy', 'okay', 'struggling', 'critical']),
    issues: z.array(z.string()),
  });

// Type exports
export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type CareTask = typeof careTasks.$inferSelect;
export type InsertCareTask = z.infer<typeof insertCareTaskSchema>;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;