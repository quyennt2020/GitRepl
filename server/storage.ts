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
  async createChainAssignment(assignment: InsertChainAssignment): Promise<ChainAssignment> {
    console.log(`[Storage] Creating chain assignment:`, assignment);

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create the assignment
      const [newAssignment] = await tx.insert(chainAssignments)
        .values({
          ...assignment,
          completedSteps: [],
          progressPercentage: 0,
          lastUpdated: new Date()
        })
        .returning();

      // Get the first step of the chain
      const steps = await this.getChainSteps(assignment.chainId);
      if (steps.length > 0) {
        const firstStep = steps[0];

        // Update the assignment with the first step
        const [updatedAssignment] = await tx.update(chainAssignments)
          .set({ currentStepId: firstStep.id })
          .where(eq(chainAssignments.id, newAssignment.id))
          .returning();

        // Create the first task
        await tx.insert(careTasks).values({
          plantId: assignment.plantId,
          templateId: firstStep.templateId,
          chainAssignmentId: newAssignment.id,
          chainStepId: firstStep.id,
          dueDate: new Date(),
          completed: false,
          notes: `Part of chain: ${assignment.chainId}, step: 1`,
          checklistProgress: {},
          stepOrder: 0
        });

        console.log(`[Storage] Created first task for chain ${assignment.chainId}`);
        return updatedAssignment;
      }

      return newAssignment;
    });
  }
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
    let query = db.select()
      .from(chainAssignments)
      .orderBy(desc(chainAssignments.startedAt));

    if (plantId) {
      query = query.where(eq(chainAssignments.plantId, plantId));
    }

    const assignments = await query;
    console.log('Retrieved assignments:', assignments);

    // For each assignment, calculate progress if not set
    return Promise.all(assignments.map(async (assignment) => {
      if (assignment.progressPercentage === 0 && assignment.status === "active") {
        // Get all steps for this chain
        const steps = await this.getChainSteps(assignment.chainId);

        // Get completed care tasks
        const completedTasks = await db.select()
          .from(careTasks)
          .where(and(
            eq(careTasks.chainAssignmentId, assignment.id),
            eq(careTasks.completed, true)
          ));

        // Calculate progress
        const completedSteps = completedTasks.map(task => String(task.chainStepId));
        const progressPercentage = Math.round((completedSteps.length / steps.length) * 100);

        // Update assignment in database
        const [updatedAssignment] = await db.update(chainAssignments)
          .set({
            completedSteps,
            progressPercentage,
            lastUpdated: new Date()
          })
          .where(eq(chainAssignments.id, assignment.id))
          .returning();

        return updatedAssignment;
      }
      return assignment;
    }));
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
    // Get the assignment first to check completed steps
    const [assignment] = await db.select()
      .from(chainAssignments)
      .where(eq(chainAssignments.id, assignmentId));

    if (!assignment) throw new Error("Chain assignment not found");

    // Get steps with template info
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

    // Get completed care tasks for this assignment
    const tasks = await db.select()
      .from(careTasks)
      .where(and(
        eq(careTasks.chainAssignmentId, assignmentId),
        eq(careTasks.completed, true)
      ));

    // Combine data with string comparison for step IDs
    return steps.map(step => {
      const relatedTask = tasks.find(t => t.chainStepId === step.id);
      const isCompleted = (assignment.completedSteps || []).includes(String(step.id));

      return {
        ...step,
        templateName: step.templateName ?? 'Unknown Task',
        templateDescription: step.templateDescription ?? null,
        isCompleted,
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

      // Get all steps for this chain
      const steps = await tx.select()
        .from(chainSteps)
        .where(eq(chainSteps.chainId, assignment.chainId))
        .orderBy(chainSteps.order);

      const currentStepIndex = steps.findIndex(s => s.id === stepId);
      if (currentStepIndex === -1) throw new Error("Step not found in chain");

      // Get completed steps array and convert ids to strings
      const completedSteps = (assignment.completedSteps || []).map(String);
      completedSteps.push(String(stepId));

      // Calculate new progress percentage
      const progressPercentage = Math.round((completedSteps.length / steps.length) * 100);

      // Create care task for the completed step
      await tx.insert(careTasks).values({
        plantId: assignment.plantId,
        templateId: steps[currentStepIndex].templateId,
        chainAssignmentId: assignmentId,
        chainStepId: stepId,
        dueDate: new Date(),
        completed: true,
        completedAt: new Date(),
        notes: `Completed as part of chain: ${assignment.chainId}, step: ${currentStepIndex + 1}`,
        checklistProgress: {},
        stepOrder: currentStepIndex,
      });

      // Create next step's task if available
      const nextStep = steps[currentStepIndex + 1];
      if (nextStep) {
        await tx.insert(careTasks).values({
          plantId: assignment.plantId,
          templateId: nextStep.templateId,
          chainAssignmentId: assignmentId,
          chainStepId: nextStep.id,
          dueDate: new Date(),
          completed: false,
          notes: `Part of chain: ${assignment.chainId}, step: ${currentStepIndex + 2}`,
          checklistProgress: {},
          stepOrder: currentStepIndex + 1
        });

        await tx.update(chainAssignments)
          .set({
            currentStepId: nextStep.id,
            completedSteps,
            progressPercentage,
            lastUpdated: new Date(),
          })
          .where(eq(chainAssignments.id, assignmentId));
      } else {
        // Complete the chain if no more steps
        await tx.update(chainAssignments)
          .set({
            status: "completed",
            completedAt: new Date(),
            currentStepId: null,
            completedSteps,
            progressPercentage: 100,
            lastUpdated: new Date(),
          })
          .where(eq(chainAssignments.id, assignmentId));
      }
    });
  }
}

export const storage = new DatabaseStorage();