import { Plant, InsertPlant, CareTask, InsertCareTask, HealthRecord, InsertHealthRecord,
  TaskTemplate, InsertTaskTemplate, ChecklistItem, InsertChecklistItem,
  TaskChain, InsertTaskChain, ChainStep, InsertChainStep,
  ChainAssignment, InsertChainAssignment, StepApproval, InsertStepApproval,
  plants, careTasks, healthRecords, taskTemplates, checklistItems,
  taskChains, chainSteps, chainAssignments, stepApprovals } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  getPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, update: Partial<Plant>): Promise<Plant>;
  deletePlant(id: number): Promise<void>;
  getCareTasks(plantId?: number): Promise<CareTask[]>;
  getCareTask(id: number): Promise<CareTask | undefined>;
  createCareTask(task: InsertCareTask): Promise<CareTask>;
  updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask>;
  deleteCareTask(id: number): Promise<void>;
  getTaskTemplates(): Promise<TaskTemplate[]>;
  getTaskTemplate(id: number): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, update: Partial<TaskTemplate>): Promise<TaskTemplate>;
  deleteTaskTemplate(id: number): Promise<void>;
  getChecklistItems(templateId: number): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: number, update: Partial<ChecklistItem>): Promise<ChecklistItem>;
  deleteChecklistItem(id: number): Promise<void>;
  getTaskChains(): Promise<TaskChain[]>;
  getTaskChain(id: number): Promise<TaskChain | undefined>;
  createTaskChain(chain: InsertTaskChain): Promise<TaskChain>;
  updateTaskChain(id: number, update: Partial<TaskChain>): Promise<TaskChain>;
  deleteTaskChain(id: number): Promise<void>;
  getChainSteps(chainId: number): Promise<ChainStep[]>;
  createChainStep(step: InsertChainStep): Promise<ChainStep>;
  updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep>;
  deleteChainStep(id: number): Promise<void>;
  getChainAssignments(plantId?: number): Promise<ChainAssignment[]>;
  createChainAssignment(assignment: InsertChainAssignment): Promise<ChainAssignment>;
  updateChainAssignment(id: number, update: Partial<ChainAssignment>): Promise<ChainAssignment>;
  deleteChainAssignment(id: number): Promise<void>;
  getStepApprovals(assignmentId: number): Promise<StepApproval[]>;
  createStepApproval(approval: InsertStepApproval): Promise<StepApproval>;
  deleteStepApproval(id: number): Promise<void>;
  getHealthRecords(plantId: number): Promise<HealthRecord[]>;
  getHealthRecord(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecord(id: number, update: Partial<HealthRecord>): Promise<HealthRecord>;
}

class DatabaseStorage implements IStorage {
  async getPlants(): Promise<Plant[]> {
    return db.select().from(plants);
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant;
  }

  async createPlant(plant: InsertPlant): Promise<Plant> {
    const [newPlant] = await db.insert(plants).values(plant).returning();
    return newPlant;
  }

  async updatePlant(id: number, update: Partial<Plant>): Promise<Plant> {
    const [plant] = await db.update(plants).set(update).where(eq(plants.id, id)).returning();
    if (!plant) throw new Error("Plant not found");
    return plant;
  }

  async deletePlant(id: number): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
  }

  async getCareTasks(plantId?: number): Promise<CareTask[]> {
    let query = db.select().from(careTasks);
    if (plantId) {
      query = query.where(eq(careTasks.plantId, plantId));
    }
    return query;
  }

  async getCareTask(id: number): Promise<CareTask | undefined> {
    const [task] = await db.select().from(careTasks).where(eq(careTasks.id, id));
    return task;
  }

  async createCareTask(task: InsertCareTask): Promise<CareTask> {
    const [newTask] = await db.insert(careTasks).values(task).returning();
    return newTask;
  }

  async updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask> {
    const [task] = await db.update(careTasks).set(update).where(eq(careTasks.id, id)).returning();
    if (!task) throw new Error("Care task not found");
    return task;
  }

  async deleteCareTask(id: number): Promise<void> {
    await db.delete(careTasks).where(eq(careTasks.id, id));
  }

  async getTaskTemplates(): Promise<TaskTemplate[]> {
    return db.select().from(taskTemplates);
  }

  async getTaskTemplate(id: number): Promise<TaskTemplate | undefined> {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id));
    return template;
  }

  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [newTemplate] = await db.insert(taskTemplates).values(template).returning();
    return newTemplate;
  }

  async updateTaskTemplate(id: number, update: Partial<TaskTemplate>): Promise<TaskTemplate> {
    const [template] = await db.update(taskTemplates).set(update).where(eq(taskTemplates.id, id)).returning();
    if (!template) throw new Error("Task template not found");
    return template;
  }

  async deleteTaskTemplate(id: number): Promise<void> {
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  }

  async getChecklistItems(templateId: number): Promise<ChecklistItem[]> {
    return db.select().from(checklistItems).where(eq(checklistItems.templateId, templateId));
  }

  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const [newItem] = await db.insert(checklistItems).values(item).returning();
    return newItem;
  }

  async updateChecklistItem(id: number, update: Partial<ChecklistItem>): Promise<ChecklistItem> {
    const [item] = await db.update(checklistItems).set(update).where(eq(checklistItems.id, id)).returning();
    if (!item) throw new Error("Checklist item not found");
    return item;
  }

  async deleteChecklistItem(id: number): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.id, id));
  }

  async getTaskChains(): Promise<TaskChain[]> {
    return db.select().from(taskChains);
  }

  async getTaskChain(id: number): Promise<TaskChain | undefined> {
    const [chain] = await db.select().from(taskChains).where(eq(taskChains.id, id));
    return chain;
  }

  async createTaskChain(chain: InsertTaskChain): Promise<TaskChain> {
    const [newChain] = await db.insert(taskChains).values(chain).returning();
    return newChain;
  }

  async updateTaskChain(id: number, update: Partial<TaskChain>): Promise<TaskChain> {
    const [chain] = await db.update(taskChains).set(update).where(eq(taskChains.id, id)).returning();
    if (!chain) throw new Error("Task chain not found");
    return chain;
  }

  async deleteTaskChain(id: number): Promise<void> {
    console.log(`[Storage] Deleting chain ${id} and its dependencies`);

    // Delete step approvals first
    await db.delete(stepApprovals).where(
      eq(stepApprovals.assignmentId,
        db.select({ id: chainAssignments.id })
          .from(chainAssignments)
          .where(eq(chainAssignments.chainId, id))
          .limit(1)
      )
    );

    // Delete chain assignments
    await db.delete(chainAssignments).where(eq(chainAssignments.chainId, id));

    // Delete chain steps
    await db.delete(chainSteps).where(eq(chainSteps.chainId, id));

    // Finally delete the chain itself
    await db.delete(taskChains).where(eq(taskChains.id, id));

    console.log(`[Storage] Successfully deleted chain ${id} and all its dependencies`);
  }

  async getChainSteps(chainId: number): Promise<ChainStep[]> {
    return db.select({
      id: chainSteps.id,
      chainId: chainSteps.chainId,
      templateId: chainSteps.templateId,
      order: chainSteps.order,
      isRequired: chainSteps.isRequired,
      waitDuration: chainSteps.waitDuration,
      requiresApproval: chainSteps.requiresApproval,
      approvalRoles: chainSteps.approvalRoles,
      templateName: taskTemplates.name,
      templateDescription: taskTemplates.description,
    })
      .from(chainSteps)
      .leftJoin(taskTemplates, eq(chainSteps.templateId, taskTemplates.id))
      .where(eq(chainSteps.chainId, chainId))
      .orderBy(chainSteps.order);
  }

  async createChainStep(step: InsertChainStep): Promise<ChainStep> {
    const [newStep] = await db.insert(chainSteps).values(step).returning();
    return newStep;
  }

  async updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep> {
    const [step] = await db.update(chainSteps).set(update).where(eq(chainSteps.id, id)).returning();
    if (!step) throw new Error("Chain step not found");
    return step;
  }

  async deleteChainStep(id: number): Promise<void> {
    await db.delete(chainSteps).where(eq(chainSteps.id, id));
  }

  async getChainAssignments(plantId?: number): Promise<ChainAssignment[]> {
    let query = db.select().from(chainAssignments);
    if (plantId) {
      query = query.where(eq(chainAssignments.plantId, plantId));
    }
    return query;
  }

  async createChainAssignment(assignment: InsertChainAssignment): Promise<ChainAssignment> {
    const [newAssignment] = await db.insert(chainAssignments).values(assignment).returning();
    return newAssignment;
  }

  async updateChainAssignment(id: number, update: Partial<ChainAssignment>): Promise<ChainAssignment> {
    const [assignment] = await db.update(chainAssignments).set(update).where(eq(chainAssignments.id, id)).returning();
    if (!assignment) throw new Error("Chain assignment not found");
    return assignment;
  }

  async deleteChainAssignment(id: number): Promise<void> {
    await db.delete(chainAssignments).where(eq(chainAssignments.id, id));
  }

  async getStepApprovals(assignmentId: number): Promise<StepApproval[]> {
    return db.select().from(stepApprovals).where(eq(stepApprovals.assignmentId, assignmentId));
  }

  async createStepApproval(approval: InsertStepApproval): Promise<StepApproval> {
    const [newApproval] = await db.insert(stepApprovals).values(approval).returning();
    return newApproval;
  }

  async deleteStepApproval(id: number): Promise<void> {
    await db.delete(stepApprovals).where(eq(stepApprovals.id, id));
  }

  async getHealthRecords(plantId: number): Promise<HealthRecord[]> {
    return db.select().from(healthRecords).where(eq(healthRecords.plantId, plantId));
  }

  async getHealthRecord(id: number): Promise<HealthRecord | undefined> {
    const [record] = await db.select().from(healthRecords).where(eq(healthRecords.id, id));
    return record;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [newRecord] = await db.insert(healthRecords).values(record).returning();
    return newRecord;
  }

  async updateHealthRecord(id: number, update: Partial<HealthRecord>): Promise<HealthRecord> {
    const [record] = await db.update(healthRecords).set(update).where(eq(healthRecords.id, id)).returning();
    if (!record) throw new Error("Health record not found");
    return record;
  }
}

export const storage = new DatabaseStorage();