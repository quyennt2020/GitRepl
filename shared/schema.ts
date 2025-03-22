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

// Add care task relationship to chain steps
export const careTasks = pgTable("care_tasks", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  templateId: integer("template_id").notNull(),
  chainAssignmentId: integer("chain_assignment_id"), // Link to chain assignment
  chainStepId: integer("chain_step_id"), // Link to specific chain step
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  checklistProgress: jsonb("checklist_progress"), // Store completion status of checklist items
  stepOrder: integer("step_order"), // Track step order within chain
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

// Update care task schema with new fields
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
    chainAssignmentId: z.coerce.number().optional(),
    chainStepId: z.coerce.number().optional(),
    stepOrder: z.number().optional(),
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

// New tables for task chains
export const taskChains = pgTable("task_chains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // matches task template categories
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const chainSteps = pgTable("chain_steps", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  templateId: integer("template_id").notNull(), // References existing task templates
  order: integer("order").notNull(),
  isRequired: boolean("is_required").default(true),
  waitDuration: integer("wait_duration"), // Hours to wait after previous step
  condition: jsonb("condition"), // Conditions for step to be active
  requiresApproval: boolean("requires_approval").default(false),
  approvalRoles: text("approval_roles").array(), // Roles that can approve this step
});

// Modified chainAssignments table definition
export const chainAssignments = pgTable("chain_assignments", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  plantId: integer("plant_id").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  currentStepId: integer("current_step_id"),
  status: text("status").notNull(), // active, completed, cancelled
  completedSteps: text("completed_steps").array(), // Array of completed step IDs
  progressPercentage: integer("progress_percentage").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const stepApprovals = pgTable("step_approvals", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  stepId: integer("step_id").notNull(),
  approvedBy: integer("approved_by").notNull(), // Reference to user table
  approvedAt: timestamp("approved_at").defaultNow(),
  notes: text("notes"),
});

// Add Zod schemas for the new tables
export const insertTaskChainSchema = createInsertSchema(taskChains)
  .omit({ id: true, createdAt: true })
  .extend({
    category: z.enum(["water", "fertilize", "prune", "check", "repot", "clean"]),
  });

export const insertChainStepSchema = createInsertSchema(chainSteps)
  .omit({ id: true })
  .extend({
    waitDuration: z.number().min(0).default(0),
    condition: z.record(z.unknown()).optional(),
    approvalRoles: z.array(z.string()).default([]),
  });

export const insertChainAssignmentSchema = createInsertSchema(chainAssignments)
  .omit({ id: true, startedAt: true, completedAt: true, currentStepId: true })
  .extend({
    status: z.enum(["active", "completed", "cancelled"]).default("active"),
  });

export const insertStepApprovalSchema = createInsertSchema(stepApprovals)
  .omit({ id: true, approvedAt: true });

// Add type exports for the new tables
export type TaskChain = typeof taskChains.$inferSelect & { stepCount?: number };
export type InsertTaskChain = z.infer<typeof insertTaskChainSchema>;
export type ChainStep = typeof chainSteps.$inferSelect;
export type InsertChainStep = z.infer<typeof insertChainStepSchema>;
export type ChainAssignment = typeof chainAssignments.$inferSelect;
export type InsertChainAssignment = z.infer<typeof insertChainAssignmentSchema>;
export type StepApproval = typeof stepApprovals.$inferSelect;
export type InsertStepApproval = z.infer<typeof insertStepApprovalSchema>;
