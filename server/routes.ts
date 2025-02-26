import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlantSchema, insertCareTaskSchema, insertHealthRecordSchema, insertTaskTemplateSchema, insertChecklistItemSchema } from "@shared/schema";
import type { ChecklistItem } from "@shared/schema";

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

      // Ensure all templates have the expected fields with defaults if missing
      const sanitizedTemplates = templates.map(template => ({
        ...template,
        oneShot: template.oneShot ?? false,
        public: template.public ?? false,
        applyToAll: template.applyToAll ?? false,
        priority: template.priority || 'medium',
        estimatedDuration: template.estimatedDuration || 15,
        requiresExpertise: template.requiresExpertise ?? false,
      }));

      res.json(sanitizedTemplates);
    } catch (error) {
      console.error('Error fetching task templates:', error);
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
  app.get("/api/task-templates/checklist-items", async (_req, res) => {
    try {
      const templates = await storage.getTaskTemplates();
      const checklistItemsByTemplate: Record<number, ChecklistItem[]> = {};

      if (templates?.length) {
        // Use Promise.all to fetch all checklist items in parallel
        const results = await Promise.all(
          templates.map(async (template) => {
            try {
              const items = await storage.getChecklistItems(template.id);
              return { templateId: template.id, items };
            } catch (err) {
              console.error(`Error fetching items for template ${template.id}:`, err);
              return { templateId: template.id, items: [] };
            }
          })
        );

        // Convert results to the expected format
        results.forEach(({ templateId, items }) => {
          checklistItemsByTemplate[templateId] = items;
        });
      }

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
      console.log('Fetching tasks for plantId:', plantId);

      const tasks = await storage.getCareTasks(plantId);

      // Sanitize task data to ensure all fields have default values
      const sanitizedTasks = tasks.map(task => ({
        ...task,
        progress: task.progress ?? 0,
        status: task.status ?? 'pending',
        checklistProgress: task.checklistProgress ?? {},
      }));

      console.log('Retrieved tasks:', sanitizedTasks);

      res.json(sanitizedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Task creation endpoint
  app.post("/api/tasks", async (req, res) => {
    const result = insertCareTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.message });
    }

    try {
      // Get the template to check settings
      const template = await storage.getTaskTemplate(result.data.templateId);
      if (!template) {
        return res.status(404).json({
          message: "Template not found",
          code: "TEMPLATE_NOT_FOUND"
        });
      }

      // Log template details for debugging
      console.log('Creating task from template:', {
        templateId: template.id,
        name: template.name,
        oneShot: template.oneShot,
        applyToAll: template.applyToAll
      });

      // Check if template is public
      if (!template.public) {
        return res.status(403).json({
          message: "This template is not public and cannot be used to create tasks",
          code: "TEMPLATE_NOT_PUBLIC"
        });
      }

      // If bulkCreate is requested but template doesn't allow it
      if (req.query.bulkCreate === 'true' && !template.applyToAll) {
        return res.status(403).json({
          message: "This template does not support bulk task creation",
          code: "BULK_NOT_ALLOWED"
        });
      }

      // Handle bulk creation (only if explicitly requested AND template allows it)
      if (req.query.bulkCreate === 'true' && template.applyToAll) {
        console.log('Creating bulk tasks for template:', template.id);
        const plants = await storage.getPlants();
        const tasks = await Promise.all(
          plants.map(plant =>
            storage.createCareTask({
              ...result.data,
              plantId: plant.id,
              status: "pending",
              progress: 0
            })
          )
        );

        return res.status(201).json({
          tasks,
          appliedToAll: true
        });
      }

      // Single plant task creation
      console.log('Creating single task for plant:', result.data.plantId);
      const task = await storage.createCareTask({
        ...result.data,
        status: "pending",
        progress: 0
      });
      return res.status(201).json({
        tasks: [task],
        appliedToAll: false
      });

    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create task",
        code: "SERVER_ERROR"
      });
    }
  });

  // Task update endpoint with enhanced logging
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
        completedAt: req.body.completedAt ? new Date(req.body.completedAt) : null,
        startedAt: req.body.startedAt ? new Date(req.body.startedAt) : null,
        lastUpdated: new Date()
      };

      console.log('Updating task:', taskId, 'with data:', {
        status: updateData.status,
        progress: updateData.progress,
        completed: updateData.completed,
        startedAt: updateData.startedAt,
        lastUpdated: updateData.lastUpdated
      });

      const task = await storage.updateCareTask(taskId, updateData);
      console.log('Task updated successfully:', {
        id: task.id,
        status: task.status,
        progress: task.progress,
        completed: task.completed
      });
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

      // First check if the task exists
      const task = await storage.getCareTask(taskId);
      if (!task) {
        return res.status(404).json({
          message: "Task not found",
          code: "NOT_FOUND"
        });
      }

      await storage.deleteCareTask(taskId);
      res.status(204).end();
    } catch (error) {
      console.error('Error in delete task route:', error);
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