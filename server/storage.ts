import { Plant, InsertPlant, CareTask, InsertCareTask } from "@shared/schema";

export interface IStorage {
  // Plants
  getPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plant: Partial<Plant>): Promise<Plant>;
  deletePlant(id: number): Promise<void>;
  
  // Care Tasks
  getCareTasks(): Promise<CareTask[]>;
  getCareTask(id: number): Promise<CareTask | undefined>;
  createCareTask(task: InsertCareTask): Promise<CareTask>;
  updateCareTask(id: number, task: Partial<CareTask>): Promise<CareTask>;
  deleteCareTasks(plantId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private plants: Map<number, Plant>;
  private careTasks: Map<number, CareTask>;
  private plantId: number;
  private taskId: number;

  constructor() {
    this.plants = new Map();
    this.careTasks = new Map();
    this.plantId = 1;
    this.taskId = 1;
  }

  async getPlants(): Promise<Plant[]> {
    return Array.from(this.plants.values());
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    return this.plants.get(id);
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const id = this.plantId++;
    const plant: Plant = {
      ...insertPlant,
      id,
      lastWatered: new Date(),
      lastFertilized: new Date(),
    };
    this.plants.set(id, plant);
    return plant;
  }

  async updatePlant(id: number, update: Partial<Plant>): Promise<Plant> {
    const plant = await this.getPlant(id);
    if (!plant) throw new Error("Plant not found");
    
    const updated = { ...plant, ...update };
    this.plants.set(id, updated);
    return updated;
  }

  async deletePlant(id: number): Promise<void> {
    this.plants.delete(id);
    await this.deleteCareTasks(id);
  }

  async getCareTasks(): Promise<CareTask[]> {
    return Array.from(this.careTasks.values());
  }

  async getCareTask(id: number): Promise<CareTask | undefined> {
    return this.careTasks.get(id);
  }

  async createCareTask(insertTask: InsertCareTask): Promise<CareTask> {
    const id = this.taskId++;
    const task: CareTask = { ...insertTask, id };
    this.careTasks.set(id, task);
    return task;
  }

  async updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask> {
    const task = await this.getCareTask(id);
    if (!task) throw new Error("Task not found");
    
    const updated = { ...task, ...update };
    this.careTasks.set(id, updated);
    return updated;
  }

  async deleteCareTasks(plantId: number): Promise<void> {
    for (const [id, task] of this.careTasks) {
      if (task.plantId === plantId) {
        this.careTasks.delete(id);
      }
    }
  }
}

export const storage = new MemStorage();
