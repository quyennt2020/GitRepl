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

  // Enhanced chain-related methods
  getChainStepsWithProgress(chainId: number, assignmentId: number): Promise<(ChainStep & {
    templateName: string;
    templateDescription: string | null;
    isCompleted: boolean;
    careTaskId?: number;
  })[]>;

  completeChainStep(assignmentId: number, stepId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getPlants(): Promise<Plant[]> {
    return db.select().from(plants);
  }
  async getPlant(id: number): Promise<Plant | undefined> {
    const [plant] = await db.select()
      .from(plants)
      .where(eq(plants.id, id));
    return plant;
  }
  async createPlant(plant: InsertPlant): Promise<Plant> {
    const [newPlant] = await db.insert(plants)
      .values(plant)
      .returning();
    return newPlant;
  }
  async updatePlant(id: number, update: Partial<Plant>): Promise<Plant> {
    const [plant] = await db.update(plants)
      .set(update)
      .where(eq(plants.id, id))
      .returning();
    if (!plant) throw new Error("Plant not found");
    return plant;
  }
  async deletePlant(id: number): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
  }
  async getCareTasks(plantId?: number): Promise<CareTask[]> {
    console.log('Fetching tasks for plantId:', plantId);
    let query = db.select().from(careTasks);

    if (plantId) {
      query = query.where(eq(careTasks.plantId, plantId));
    }

    // Order by due date descending
    query = query.orderBy(desc(careTasks.dueDate));

    try {
      const tasks = await query;
      console.log('Retrieved tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error("Failed to fetch care tasks");
    }
  }
  async getCareTask(id: number): Promise<CareTask | undefined> {
    const [task] = await db.select()
      .from(careTasks)
      .where(eq(careTasks.id, id));
    return task;
  }
  async createCareTask(task: InsertCareTask): Promise<CareTask> {
    const [newTask] = await db.insert(careTasks)
      .values({
        ...task,
        completed: false,
        checklistProgress: task.checklistProgress ?? {}
      })
      .returning();
    return newTask;
  }
  async updateCareTask(id: number, update: Partial<CareTask>): Promise<CareTask> {
    const [task] = await db.update(careTasks)
      .set(update)
      .where(eq(careTasks.id, id))
      .returning();
    if (!task) throw new Error("Care task not found");
    return task;
  }
  async deleteCareTask(id: number): Promise<void> {
    await db.delete(careTasks).where(eq(careTasks.id, id));
  }
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

  async getChainStepsWithProgress(chainId: number, assignmentId: number): Promise<(ChainStep & {
    templateName: string;
    templateDescription: string | null;
    isCompleted: boolean;
    careTaskId?: number;
  })[]> {
    console.log('Fetching steps with progress for chain:', chainId, 'assignment:', assignmentId);

    // Get all steps with template info
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

    // Get all care tasks for this chain assignment
    const tasks = await db.select()
      .from(careTasks)
      .where(and(
        eq(careTasks.chainAssignmentId, assignmentId),
        eq(careTasks.completed, true)
      ));

    // Combine step data with care task completion status
    return steps.map(step => {
      const relatedTask = tasks.find(t => t.chainStepId === step.id);
      return {
        ...step,
        templateName: step.templateName ?? 'Unknown Task',
        templateDescription: step.templateDescription ?? null,
        isCompleted: !!relatedTask?.completed,
        careTaskId: relatedTask?.id
      };
    });
  }

  async completeChainStep(assignmentId: number, stepId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Get the assignment
      const [assignment] = await tx.select()
        .from(chainAssignments)
        .where(eq(chainAssignments.id, assignmentId));

      if (!assignment) throw new Error("Chain assignment not found");

      // Get the step
      const [step] = await tx.select()
        .from(chainSteps)
        .where(eq(chainSteps.id, stepId));

      if (!step) throw new Error("Chain step not found");

      // Create or update the care task for this step
      const [existingTask] = await tx.select()
        .from(careTasks)
        .where(and(
          eq(careTasks.chainAssignmentId, assignmentId),
          eq(careTasks.chainStepId, stepId)
        ));

      if (!existingTask) {
        await tx.insert(careTasks).values({
          plantId: assignment.plantId,
          templateId: step.templateId,
          chainAssignmentId: assignmentId,
          chainStepId: stepId,
          dueDate: new Date(),
          completed: true,
          completedAt: new Date(),
          notes: `Completed as part of chain: ${assignment.chainId}, step: ${step.order}`,
          checklistProgress: {},
        });
      } else {
        await tx.update(careTasks)
          .set({
            completed: true,
            completedAt: new Date()
          })
          .where(eq(careTasks.id, existingTask.id));
      }

      // Get all steps to determine the next step
      const steps = await tx.select()
        .from(chainSteps)
        .where(eq(chainSteps.chainId, assignment.chainId))
        .orderBy(chainSteps.order);

      const currentStepIndex = steps.findIndex(s => s.id === stepId);
      const nextStep = steps[currentStepIndex + 1];

      // Update the assignment status
      if (nextStep) {
        await tx.update(chainAssignments)
          .set({ currentStepId: nextStep.id })
          .where(eq(chainAssignments.id, assignmentId));
      } else {
        await tx.update(chainAssignments)
          .set({
            status: "completed",
            completedAt: new Date(),
            currentStepId: null
          })
          .where(eq(chainAssignments.id, assignmentId));
      }
    });
  }
}

export const storage = new DatabaseStorage();