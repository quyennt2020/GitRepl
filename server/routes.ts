import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlantSchema, insertCareTaskSchema, insertHealthRecordSchema, insertTaskTemplateSchema, insertChecklistItemSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Plants routes
  app.get("/api/plants", async (_req, res) => {
    const plants = await storage.getPlants();
    res.json(plants);
  });

  app.get("/api/plants/:id", async (req, res) => {
    const plant = await storage.getPlant(Number(req.params.id));
    if (!plant) return res.status(404).json({ message: "Plant not found" });
    res.json(plant);
  });

  app.post("/api/plants", async (req, res) => {
    const result = insertPlantSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }

    const plant = await storage.createPlant(result.data);

    // Do not automatically create any tasks for new plants
    // Tasks will be created only when explicitly requested or when assigned through the UI
    res.status(201).json(plant);
  });

  app.patch("/api/plants/:id", async (req, res) => {
    const plant = await storage.updatePlant(Number(req.params.id), req.body);
    res.json(plant);
  });

  app.delete("/api/plants/:id", async (req, res) => {
    await storage.deletePlant(Number(req.params.id));
    res.status(204).end();
  });

  // Task Templates routes
  app.get("/api/task-templates", async (_req, res) => {
    try {
      const templates = await storage.getTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task templates" });
    }
  });

  app.get("/api/task-templates/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task template ID" });
    }

    try {
      const template = await storage.getTaskTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Task template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task template" });
    }
  });

  app.post("/api/task-templates", async (req, res) => {
    const result = insertTaskTemplateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }
    const template = await storage.createTaskTemplate(result.data);
    res.status(201).json(template);
  });

  app.patch("/api/task-templates/:id", async (req, res) => {
    const template = await storage.updateTaskTemplate(Number(req.params.id), req.body);
    res.json(template);
  });

  app.delete("/api/task-templates/:id", async (req, res) => {
    await storage.deleteTaskTemplate(Number(req.params.id));
    res.status(204).end();
  });

  // Checklist Items routes
  app.get("/api/task-templates/checklist-items", async (req, res) => {
    try {
      const templates = await storage.getTaskTemplates();
      if (!templates?.length) {
        return res.json({});
      }
      
      const checklistItemsByTemplate: Record<number, ChecklistItem[]> = {};
      
      await Promise.all(templates.map(async (template) => {
        try {
          const items = await storage.getChecklistItems(template.id);
          checklistItemsByTemplate[template.id] = items;
        } catch (err) {
          console.error(`Error fetching items for template ${template.id}:`, err);
          checklistItemsByTemplate[template.id] = [];
        }
      }));
      
      res.json(checklistItemsByTemplate);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.get("/api/task-templates/:templateId/checklist", async (req, res) => {
    const items = await storage.getChecklistItems(Number(req.params.templateId));
    res.json(items);
  });

  app.post("/api/checklist-items", async (req, res) => {
    const result = insertChecklistItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }
    const item = await storage.createChecklistItem(result.data);
    res.status(201).json(item);
  });

  app.patch("/api/checklist-items/:id", async (req, res) => {
    const item = await storage.updateChecklistItem(Number(req.params.id), req.body);
    res.json(item);
  });

  app.delete("/api/checklist-items/:id", async (req, res) => {
    await storage.deleteChecklistItem(Number(req.params.id));
    res.status(204).end();
  });

  // Care Tasks with template support
  app.get("/api/tasks", async (req, res) => {
    try {
      const plantId = req.query.plantId ? Number(req.query.plantId) : undefined;
      const tasks = await storage.getCareTasks(plantId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const result = insertCareTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }
    const task = await storage.createCareTask(result.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          message: "Invalid task ID",
          code: "INVALID_ID"
        });
      }

      // Convert completedAt to proper Date object if present
      const updateData = {
        ...req.body,
        completedAt: req.body.completedAt ? new Date(req.body.completedAt) : null
      };

      const task = await storage.updateCareTask(taskId, updateData);
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update task",
        code: "SERVER_ERROR"
      });
    }
  });

  // Task-related routes
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          message: "Invalid task ID",
          code: "INVALID_ID"
        });
      }

      await storage.deleteCareTask(taskId);
      res.status(204).end();
    } catch (error) {
      console.error('Error in delete task route:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          message: error.message,
          code: "NOT_FOUND"
        });
      }
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to delete task",
        code: "SERVER_ERROR"
      });
    }
  });

  // Health records routes
  app.get("/api/plants/:id/health", async (req, res) => {
    const records = await storage.getHealthRecords(Number(req.params.id));
    res.json(records);
  });

  app.post("/api/plants/:id/health", async (req, res) => {
    const result = insertHealthRecordSchema.safeParse({
      ...req.body,
      plantId: Number(req.params.id),
    });
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }
    const record = await storage.createHealthRecord(result.data);
    res.status(201).json(record);
  });

  app.get("/api/health-records/:id", async (req, res) => {
    const record = await storage.getHealthRecord(Number(req.params.id));
    if (!record) return res.status(404).json({ message: "Health record not found" });
    res.json(record);
  });

  app.patch("/api/health-records/:id", async (req, res) => {
    const result = insertHealthRecordSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }
    const record = await storage.updateHealthRecord(Number(req.params.id), result.data);
    res.json(record);
  });

  const httpServer = createServer(app);
  return httpServer;
}