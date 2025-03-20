import { Plant, InsertPlant, CareTask, InsertCareTask, HealthRecord, InsertHealthRecord,
  TaskTemplate, InsertTaskTemplate, ChecklistItem, InsertChecklistItem,
  TaskChain, InsertTaskChain, ChainStep, InsertChainStep,
  ChainAssignment, InsertChainAssignment, StepApproval, InsertStepApproval,
  plants, careTasks, healthRecords, taskTemplates, checklistItems,
  taskChains, chainSteps, chainAssignments, stepApprovals } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Plant related methods
  getPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, update: Partial<Plant>): Promise<Plant>;
  deletePlant(id: number): Promise<void>;

  // Care task related methods
  getCareTasks(plantId?: number): Promise<CareTask[]>;
  getCareTask(id: number): Promise<CareTask | undefined>;
  createCareTask(task: InsertCareTask): Promise<CareTask>;
  updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask>;
  deleteCareTask(id: number): Promise<void>;

  // Task template related methods
  getTaskTemplates(): Promise<TaskTemplate[]>;
  getTaskTemplate(id: number): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, update: Partial<TaskTemplate>): Promise<TaskTemplate>;
  deleteTaskTemplate(id: number): Promise<void>;

  // Chain related methods
  getTaskChains(): Promise<TaskChain[]>;
  getTaskChain(id: number): Promise<TaskChain | undefined>;
  createTaskChain(chain: InsertTaskChain): Promise<TaskChain>;
  updateTaskChain(id: number, update: Partial<TaskChain>): Promise<TaskChain>;
  deleteTaskChain(id: number): Promise<void>;

  // Chain step related methods
  getChainSteps(chainId: number): Promise<(ChainStep & { templateName: string; templateDescription: string | null })[]>;
  createChainStep(step: InsertChainStep): Promise<ChainStep>;
  updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep>;
  deleteChainStep(id: number): Promise<void>;
  getChainStep(id: number): Promise<ChainStep | undefined>;

  // Chain assignment related methods
  getChainAssignments(plantId?: number): Promise<ChainAssignment[]>;
  getChainAssignment(id: number): Promise<ChainAssignment | undefined>;
  createChainAssignment(assignment: InsertChainAssignment): Promise<ChainAssignment>;
  updateChainAssignment(id: number, update: Partial<ChainAssignment>): Promise<ChainAssignment>;
  deleteChainAssignment(id: number): Promise<void>;

  // Step approval related methods
  getStepApprovals(assignmentId: number): Promise<StepApproval[]>;
  createStepApproval(approval: InsertStepApproval): Promise<StepApproval>;
  deleteStepApproval(id: number): Promise<void>;

  // Health record related methods
  getHealthRecords(plantId: number): Promise<HealthRecord[]>;
  getHealthRecord(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecord(id: number, update: Partial<HealthRecord>): Promise<HealthRecord>;

  // Chain task methods
  createTaskForChainStep(assignmentId: number, stepId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getPlants(): Promise<Plant[]> {
    return db.select().from(plants);
  }
  async getPlant(id: number): Promise<Plant | undefined> { throw new Error("Method not implemented."); }
  async createPlant(plant: InsertPlant): Promise<Plant> { throw new Error("Method not implemented."); }
  async updatePlant(id: number, update: Partial<Plant>): Promise<Plant> { throw new Error("Method not implemented."); }
  async deletePlant(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async getCareTasks(plantId?: number): Promise<CareTask[]> { throw new Error("Method not implemented."); }
  async getCareTask(id: number): Promise<CareTask | undefined> { throw new Error("Method not implemented."); }
  async createCareTask(task: InsertCareTask): Promise<CareTask> { throw new Error("Method not implemented."); }
  async updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask> { throw new Error("Method not implemented."); }
  async deleteCareTask(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async getTaskTemplates(): Promise<TaskTemplate[]> { throw new Error("Method not implemented."); }
  async getTaskTemplate(id: number): Promise<TaskTemplate | undefined> { throw new Error("Method not implemented."); }
  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> { throw new Error("Method not implemented."); }
  async updateTaskTemplate(id: number, update: Partial<TaskTemplate>): Promise<TaskTemplate> { throw new Error("Method not implemented."); }
  async deleteTaskTemplate(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async createTaskChain(chain: InsertTaskChain): Promise<TaskChain> { throw new Error("Method not implemented."); }
  async updateTaskChain(id: number, update: Partial<TaskChain>): Promise<TaskChain> { throw new Error("Method not implemented."); }
  async deleteTaskChain(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async createChainStep(step: InsertChainStep): Promise<ChainStep> { throw new Error("Method not implemented."); }
  async updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep> { throw new Error("Method not implemented."); }
  async deleteChainStep(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async getChainStep(id: number): Promise<ChainStep | undefined> { throw new Error("Method not implemented."); }
  async createChainAssignment(assignment: InsertChainAssignment): Promise<ChainAssignment> { throw new Error("Method not implemented."); }
  async updateChainAssignment(id: number, update: Partial<ChainAssignment>): Promise<ChainAssignment> { throw new Error("Method not implemented."); }
  async deleteChainAssignment(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async getStepApprovals(assignmentId: number): Promise<StepApproval[]> { throw new Error("Method not implemented."); }
  async createStepApproval(approval: InsertStepApproval): Promise<StepApproval> { throw new Error("Method not implemented."); }
  async deleteStepApproval(id: number): Promise<void> { throw new Error("Method not implemented."); }
  async getHealthRecords(plantId: number): Promise<HealthRecord[]> { throw new Error("Method not implemented."); }
  async getHealthRecord(id: number): Promise<HealthRecord | undefined> { throw new Error("Method not implemented."); }
  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> { throw new Error("Method not implemented."); }
  async updateHealthRecord(id: number, update: Partial<HealthRecord>): Promise<HealthRecord> { throw new Error("Method not implemented."); }
  async createTaskForChainStep(assignmentId: number, stepId: number): Promise<void> { throw new Error("Method not implemented."); }

  async getTaskChains(): Promise<TaskChain[]> {
    return db.select()
      .from(taskChains)
      .where(eq(taskChains.isActive, true))
      .orderBy(desc(taskChains.createdAt));
  }

  async getChainAssignments(plantId?: number): Promise<ChainAssignment[]> {
    let query = db.select().from(chainAssignments);

    if (plantId) {
      query = query.where(eq(chainAssignments.plantId, plantId));
    }

    const assignments = await query.orderBy(desc(chainAssignments.startedAt));
    console.log('Retrieved assignments:', assignments);
    return assignments;
  }

  async getChainAssignment(id: number): Promise<ChainAssignment | undefined> {
    console.log('Fetching chain assignment:', id);
    const [assignment] = await db.select()
      .from(chainAssignments)
      .where(eq(chainAssignments.id, id));

    console.log('Retrieved assignment:', assignment);
    return assignment;
  }

  async getTaskChain(id: number): Promise<TaskChain | undefined> {
    console.log('Fetching task chain:', id);
    const [chain] = await db.select()
      .from(taskChains)
      .where(and(
        eq(taskChains.id, id),
        eq(taskChains.isActive, true)
      ));

    console.log('Retrieved chain:', chain);
    return chain;
  }

  async getChainSteps(chainId: number): Promise<(ChainStep & { templateName: string; templateDescription: string | null })[]> {
    console.log('Fetching steps for chain:', chainId);
    const steps = await db.select({
      id: chainSteps.id,
      chainId: chainSteps.chainId,
      templateId: chainSteps.templateId,
      order: chainSteps.order,
      isRequired: chainSteps.isRequired,
      waitDuration: chainSteps.waitDuration,
      condition: chainSteps.condition,
      requiresApproval: chainSteps.requiresApproval,
      approvalRoles: chainSteps.approvalRoles,
      templateName: taskTemplates.name,
      templateDescription: taskTemplates.description,
    })
    .from(chainSteps)
    .leftJoin(taskTemplates, eq(chainSteps.templateId, taskTemplates.id))
    .where(eq(chainSteps.chainId, chainId))
    .orderBy(chainSteps.order);

    console.log('Retrieved steps:', steps);

    return steps.map(step => ({
      ...step,
      templateName: step.templateName ?? 'Unknown Task',
      templateDescription: step.templateDescription ?? null
    }));
  }
}

export const storage = new DatabaseStorage();