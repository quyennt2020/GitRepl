import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlantSchema, insertCareTaskSchema } from "@shared/schema";
import { log } from "./vite";

export function registerRoutes(app: Express): Server {
  // Plants
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
    try {
      const result = insertPlantSchema.safeParse(req.body);
      if (!result.success) {
        log(`Invalid plant data: ${JSON.stringify(result.error)}`);
        return res.status(400).json({ message: result.error.message });
      }
      const plant = await storage.createPlant(result.data);
      res.status(201).json(plant);
    } catch (error) {
      log(`Error creating plant: ${error}`);
      res.status(500).json({ message: "Failed to create plant" });
    }
  });

  app.patch("/api/plants/:id", async (req, res) => {
    try {
      const plantId = Number(req.params.id);
      const plant = await storage.getPlant(plantId);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      log(`Updating plant ${plantId} with data: ${JSON.stringify(req.body)}`);
      const updatedPlant = await storage.updatePlant(plantId, req.body);
      res.json(updatedPlant);
    } catch (error) {
      log(`Error updating plant: ${error}`);
      res.status(500).json({ message: "Failed to update plant" });
    }
  });

  app.delete("/api/plants/:id", async (req, res) => {
    try {
      await storage.deletePlant(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      log(`Error deleting plant: ${error}`);
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // Care Tasks
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getCareTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const result = insertCareTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }
      const task = await storage.createCareTask(result.data);
      res.status(201).json(task);
    } catch (error) {
      log(`Error creating task: ${error}`);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateCareTask(Number(req.params.id), req.body);
      res.json(task);
    } catch (error) {
      log(`Error updating task: ${error}`);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}