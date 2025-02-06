import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlantSchema, insertCareTaskSchema } from "@shared/schema";

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

  // Care Tasks
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getCareTasks();
    res.json(tasks);
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
    const task = await storage.updateCareTask(Number(req.params.id), req.body);
    res.json(task);
  });

  const httpServer = createServer(app);
  return httpServer;
}
