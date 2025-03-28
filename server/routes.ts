import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPlantSchema, insertCareTaskSchema, insertHealthRecordSchema, 
  insertTaskTemplateSchema, insertChecklistItemSchema,
  insertTaskChainSchema, insertChainStepSchema, 
  insertChainAssignmentSchema, insertStepApprovalSchema 
} from "@shared/schema";
import type { ChecklistItem } from "@shared/schema";
import backupRouter from "./routes/backup";
import multer from "multer";
import { importPlantsFromCSV } from "./import-plants";
import path from "path";
import os from "os";
import fs from 'fs/promises'; // Import fs/promises for asynchronous file operations


export function registerRoutes(app: Express): Server {
  // Configure multer for file uploads with specific file filter
  const upload = multer({
    dest: os.tmpdir(),
    fileFilter: (_req, file, cb) => {
      // Only accept CSV files
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });

  // Register backup routes
  app.use(backupRouter);

  // Plants import route with proper error handling
  app.post("/api/plants/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: "No file uploaded" 
        });
      }

      const results = await importPlantsFromCSV(req.file.path);

      // Clean up the temporary file
      await fs.unlink(req.file.path).catch(console.error);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error("Import error:", error);

      // Clean up the temporary file in case of error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }

      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to import plants" 
      });
    }
  });

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
      console.log('Retrieved tasks:', tasks);

      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

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
              plantId: plant.id
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
      const task = await storage.createCareTask(result.data);
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

  // Task Chains routes
  app.get("/api/task-chains", async (_req, res) => {
    try {
      const chains = await storage.getTaskChains();
      res.json(chains);
    } catch (error) {
      console.error('Error fetching task chains:', error);
      res.status(500).json({ message: "Failed to fetch task chains" });
    }
  });

  app.get("/api/task-chains/:id", async (req, res) => {
    try {
      const chain = await storage.getTaskChain(Number(req.params.id));
      if (!chain) {
        return res.status(404).json({ message: "Task chain not found" });
      }
      res.json(chain);
    } catch (error) {
      console.error('Error fetching task chain:', error);
      res.status(500).json({ message: "Failed to fetch task chain" });
    }
  });

  app.post("/api/task-chains", async (req, res) => {
    try {
      const result = insertTaskChainSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }
      const chain = await storage.createTaskChain(result.data);
      res.status(201).json(chain);
    } catch (error) {
      console.error('Error creating task chain:', error);
      res.status(500).json({ message: "Failed to create task chain" });
    }
  });

  app.patch("/api/task-chains/:id", async (req, res) => {
    try {
      const chain = await storage.updateTaskChain(Number(req.params.id), req.body);
      res.json(chain);
    } catch (error) {
      console.error('Error updating task chain:', error);
      res.status(500).json({ message: "Failed to update task chain" });
    }
  });

  app.delete("/api/task-chains/:id", async (req, res) => {
    try {
      await storage.deleteTaskChain(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting task chain:', error);
      res.status(500).json({ message: "Failed to delete task chain" });
    }
  });

  // Chain Steps routes
  app.get("/api/task-chains/:chainId/steps", async (req, res) => {
    try {
      const chainId = Number(req.params.chainId);
      if (isNaN(chainId)) {
        return res.status(400).json({ message: "Invalid chain ID" });
      }

      console.log('Fetching steps for chain:', chainId);
      const steps = await storage.getChainSteps(chainId);
      console.log('Retrieved steps:', steps);
      res.json(steps);
    } catch (error) {
      console.error('Error fetching chain steps:', error);
      res.status(500).json({ message: "Failed to fetch chain steps" });
    }
  });

  app.post("/api/chain-steps", async (req, res) => {
    try {
      const result = insertChainStepSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }
      const step = await storage.createChainStep(result.data);
      res.status(201).json(step);
    } catch (error) {
      console.error('Error creating chain step:', error);
      res.status(500).json({ message: "Failed to create chain step" });
    }
  });

  app.patch("/api/chain-steps/:id", async (req, res) => {
    try {
      const step = await storage.updateChainStep(Number(req.params.id), req.body);
      res.json(step);
    } catch (error) {
      console.error('Error updating chain step:', error);
      res.status(500).json({ message: "Failed to update chain step" });
    }
  });

  app.delete("/api/chain-steps/:id", async (req, res) => {
    try {
      await storage.deleteChainStep(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting chain step:', error);
      res.status(500).json({ message: "Failed to delete chain step" });
    }
  });

  // Chain Assignments routes
  app.get("/api/chain-assignments", async (req, res) => {
    try {
      const plantId = req.query.plantId ? Number(req.query.plantId) : undefined;
      const assignments = await storage.getChainAssignments(plantId);
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching chain assignments:', error);
      res.status(500).json({ message: "Failed to fetch chain assignments" });
    }
  });

  app.post("/api/chain-assignments", async (req, res) => {
    try {
      const result = insertChainAssignmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }
      const assignment = await storage.createChainAssignment(result.data);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating chain assignment:', error);
      res.status(500).json({ message: "Failed to create chain assignment" });
    }
  });

  app.patch("/api/chain-assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.updateChainAssignment(Number(req.params.id), req.body);
      res.json(assignment);
    } catch (error) {
      console.error('Error updating chain assignment:', error);
      res.status(500).json({ message: "Failed to update chain assignment" });
    }
  });

  app.delete("/api/chain-assignments/:id", async (req, res) => {
    try {
      await storage.deleteChainAssignment(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting chain assignment:', error);
      res.status(500).json({ message: "Failed to delete chain assignment" });
    }
  });

  // Step Approvals routes
  app.get("/api/chain-assignments/:assignmentId/approvals", async (req, res) => {
    try {
      const approvals = await storage.getStepApprovals(Number(req.params.assignmentId));
      res.json(approvals);
    } catch (error) {
      console.error('Error fetching step approvals:', error);
      res.status(500).json({ message: "Failed to fetch step approvals" });
    }
  });

  app.post("/api/step-approvals", async (req, res) => {
    try {
      const result = insertStepApprovalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }
      const approval = await storage.createStepApproval(result.data);
      res.status(201).json(approval);
    } catch (error) {
      console.error('Error creating step approval:', error);
      res.status(500).json({ message: "Failed to create step approval" });
    }
  });

  app.delete("/api/step-approvals/:id", async (req, res) => {
    try {
      await storage.deleteStepApproval(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting step approval:', error);
      res.status(500).json({ message: "Failed to delete step approval" });
    }
  });

  app.post("/api/chain-assignments/:assignmentId/steps/:stepId/approve", async (req, res) => {
    try {
      const assignmentId = Number(req.params.assignmentId);
      const stepId = Number(req.params.stepId);
      const { approved, notes, approvedBy } = req.body;

      console.log('Approval request received:', {
        assignmentId,
        stepId,
        approved,
        notes,
        approvedBy
      });

      if (!assignmentId || !stepId) {
        return res.status(400).json({ message: "Invalid assignment or step ID" });
      }

      // Get the assignment
      const assignment = await storage.getChainAssignment(assignmentId);
      if (!assignment) {
        console.log('Assignment not found:', assignmentId);
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Get the step
      const step = await storage.getChainStep(stepId);
      if (!step) {
        console.log('Step not found:', stepId);
        return res.status(404).json({ message: "Step not found" });
      }

      console.log('Found assignment and step:', { assignment, step });

      // Create step approval
      const approval = await storage.createStepApproval({
        assignmentId,
        stepId,
        approvedBy,
        notes: notes || null,
      });

      res.status(201).json(approval);
    } catch (error) {
      console.error('Error in step approval:', error);
      res.status(500).json({ 
        message: "Failed to process approval",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}