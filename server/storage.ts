import { Plant, InsertPlant, CareTask, InsertCareTask, HealthRecord, InsertHealthRecord,
  TaskTemplate, InsertTaskTemplate, ChecklistItem, InsertChecklistItem,
  plants, careTasks, healthRecords, taskTemplates, checklistItems } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  // Plants
  getPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plant: Partial<Plant>): Promise<Plant>;
  deletePlant(id: number): Promise<void>;

  // Care Tasks
  getCareTasks(plantId?: number): Promise<CareTask[]>;
  getCareTask(id: number): Promise<CareTask | undefined>;
  createCareTask(task: InsertCareTask): Promise<CareTask>;
  updateCareTask(id: number, task: Partial<CareTask>): Promise<CareTask>;
  deleteCareTasks(plantId: number): Promise<void>;
  deleteCareTask(id: number): Promise<void>;

  // Task Templates
  getTaskTemplates(): Promise<TaskTemplate[]>;
  getTaskTemplate(id: number): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, template: Partial<TaskTemplate>): Promise<TaskTemplate>;
  deleteTaskTemplate(id: number): Promise<void>;

  // Checklist Items
  getChecklistItems(templateId: number): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: number, item: Partial<ChecklistItem>): Promise<ChecklistItem>;
  deleteChecklistItem(id: number): Promise<void>;

  // Health Records
  getHealthRecords(plantId: number): Promise<HealthRecord[]>;
  getHealthRecord(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecord(id: number, record: Partial<HealthRecord>): Promise<HealthRecord>;
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

  // Task Template methods
  async getTaskTemplates(): Promise<TaskTemplate[]> {
    return await db
      .select()
      .from(taskTemplates)
      .orderBy(taskTemplates.name);
  }

  async getTaskTemplate(id: number): Promise<TaskTemplate | undefined> {
    if (!id || isNaN(id)) return undefined;

    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id));
    return template;
  }

  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [newTemplate] = await db
      .insert(taskTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateTaskTemplate(id: number, update: Partial<TaskTemplate>): Promise<TaskTemplate> {
    const [template] = await db
      .update(taskTemplates)
      .set(update)
      .where(eq(taskTemplates.id, id))
      .returning();
    if (!template) throw new Error("Task template not found");
    return template;
  }

  async deleteTaskTemplate(id: number): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.templateId, id));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  }

  // Checklist Items methods
  async getChecklistItems(templateId: number): Promise<ChecklistItem[]> {
    return await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.templateId, templateId))
      .orderBy(checklistItems.order);
  }

  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const [newItem] = await db
      .insert(checklistItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateChecklistItem(id: number, update: Partial<ChecklistItem>): Promise<ChecklistItem> {
    const [item] = await db
      .update(checklistItems)
      .set(update)
      .where(eq(checklistItems.id, id))
      .returning();
    if (!item) throw new Error("Checklist item not found");
    return item;
  }

  async deleteChecklistItem(id: number): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.id, id));
  }

  // Existing care tasks methods with template support
  async getCareTasks(plantId?: number): Promise<CareTask[]> {
    const query = db.select({
      id: careTasks.id,
      plantId: careTasks.plantId,
      templateId: careTasks.templateId,
      dueDate: careTasks.dueDate,
      completed: careTasks.completed,
      completedAt: careTasks.completedAt,
      notes: careTasks.notes,
      checklistProgress: careTasks.checklistProgress,
    })
    .from(careTasks)
    .leftJoin(taskTemplates, eq(careTasks.templateId, taskTemplates.id));

    if (plantId) {
      return await query.where(
        or(
          eq(careTasks.plantId, plantId),
          eq(taskTemplates.applyToAll, true)
        )
      );
    }

    return await query;
  }

  async getCareTask(id: number): Promise<CareTask | undefined> {
    const [task] = await db.select().from(careTasks).where(eq(careTasks.id, id));
    return task;
  }

  async createCareTask(task: InsertCareTask): Promise<CareTask> {
    const [newTask] = await db
      .insert(careTasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask> {
    const existingTask = await this.getCareTask(id);
    if (!existingTask) {
      throw new Error(`Care task with id ${id} not found`);
    }

    // Ensure dueDate is properly formatted if it exists in the update
    const updatedData = {
      ...update,
      dueDate: update.dueDate ? new Date(update.dueDate) : undefined,
    };

    const [task] = await db
      .update(careTasks)
      .set(updatedData)
      .where(eq(careTasks.id, id))
      .returning();
    return task;
  }

  async deleteCareTasks(plantId: number): Promise<void> {
    await db.delete(careTasks).where(eq(careTasks.plantId, plantId));
  }

  async deleteCareTask(id: number): Promise<void> {
    await db.delete(careTasks).where(eq(careTasks.id, id));
  }

  // Existing health records methods
  async getHealthRecords(plantId: number): Promise<HealthRecord[]> {
    return await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.plantId, plantId))
      .orderBy(desc(healthRecords.date));
  }

  async getHealthRecord(id: number): Promise<HealthRecord | undefined> {
    const [record] = await db.select().from(healthRecords).where(eq(healthRecords.id, id));
    return record;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [healthRecord] = await db
      .insert(healthRecords)
      .values(record)
      .returning();
    return healthRecord;
  }

  async updateHealthRecord(id: number, update: Partial<HealthRecord>): Promise<HealthRecord> {
    const [record] = await db
      .update(healthRecords)
      .set(update)
      .where(eq(healthRecords.id, id))
      .returning();
    if (!record) throw new Error("Health record not found");
    return record;
  }
}

export const storage = new DatabaseStorage();