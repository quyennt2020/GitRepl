import { Plant, InsertPlant, CareTask, InsertCareTask, plants, careTasks } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async getPlants(): Promise<Plant[]> {
    return await db.select().from(plants);
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const [plant] = await db
      .insert(plants)
      .values({
        ...insertPlant,
        lastWatered: new Date(),
        lastFertilized: new Date(),
      })
      .returning();
    return plant;
  }

  async updatePlant(id: number, update: Partial<Plant>): Promise<Plant> {
    const [plant] = await db
      .update(plants)
      .set(update)
      .where(eq(plants.id, id))
      .returning();
    if (!plant) throw new Error("Plant not found");
    return plant;
  }

  async deletePlant(id: number): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
    await this.deleteCareTasks(id);
  }

  async getCareTasks(): Promise<CareTask[]> {
    return await db.select().from(careTasks);
  }

  async getCareTask(id: number): Promise<CareTask | undefined> {
    const [task] = await db.select().from(careTasks).where(eq(careTasks.id, id));
    return task;
  }

  async createCareTask(insertTask: InsertCareTask): Promise<CareTask> {
    const [task] = await db
      .insert(careTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask> {
    const [task] = await db
      .update(careTasks)
      .set(update)
      .where(eq(careTasks.id, id))
      .returning();
    if (!task) throw new Error("Task not found");
    return task;
  }

  async deleteCareTasks(plantId: number): Promise<void> {
    await db.delete(careTasks).where(eq(careTasks.plantId, plantId));
  }
}

export const storage = new DatabaseStorage();