import { Plant, InsertPlant, CareTask, InsertCareTask, HealthRecord, InsertHealthRecord,
  TaskTemplate, InsertTaskTemplate, ChecklistItem, InsertChecklistItem,
  TaskChain, InsertTaskChain, ChainStep, InsertChainStep,
  ChainAssignment, InsertChainAssignment, StepApproval, InsertStepApproval,
  plants, careTasks, healthRecords, taskTemplates, checklistItems,
  taskChains, chainSteps, chainAssignments, stepApprovals } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

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

  // Checklist item related methods
  getChecklistItems(templateId: number): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: number, update: Partial<ChecklistItem>): Promise<ChecklistItem>;
  deleteChecklistItem(id: number): Promise<void>;

  // Chain task methods
  createTaskForChainStep(assignmentId: number, stepId: number): Promise<void>;

  // Enhanced chain-related methods
  getChainStepsWithProgress(chainId: number, assignmentId: number): Promise<(ChainStep & {
    templateName: string | null;
    templateDescription: string | null;
    isCompleted: boolean;
    careTaskId?: number | null;
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
    let query: any = db.select().from(careTasks);

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
  console.log(`Updating care task: ${id} with:`, update);
  
  // Format the date values if present
  const updatedData: Partial<CareTask> = { ...update };
  if (update.completedAt) {
    updatedData.completedAt = new Date(update.completedAt);
  } else if (update.completedAt === null) {
    updatedData.completedAt = null;
  }

  // First, get the current task to check if it's part of a chain
  const [existingTask] = await db.select()
    .from(careTasks)
    .where(eq(careTasks.id, id));
  
  if (!existingTask) {
    console.error(`Task ${id} not found`);
    throw new Error("Care task not found");
  }
  
  // Update the task
  console.log(`Updating task ${id} in database...`);
  const [task] = await db.update(careTasks)
    .set(updatedData)
    .where(eq(careTasks.id, id))
    .returning();
  
  // Now check if we need to update chain progress
  if (update.completed === true && 
      existingTask.chainAssignmentId && 
      existingTask.chainStepId && 
      !existingTask.completed) {
    
    console.log(`Task ${id} is part of chain - checking approval requirements...`);
    
    // Get the chain step to check if it requires approval
    const [chainStep] = await db.select()
      .from(chainSteps)
      .where(eq(chainSteps.id, existingTask.chainStepId));
    
    if (chainStep) {
      if (chainStep.requiresApproval) {
        console.log(`Step ${chainStep.id} requires approval. Creating step approval...`);
        try {
          // Create step approval record
          await this.createStepApproval({
            assignmentId: existingTask.chainAssignmentId,
            stepId: existingTask.chainStepId,
            approvedBy: 1, // TODO: Get the actual user ID
            notes: `Approval required for task ${id}`,
          });
          console.log(`Successfully created step approval for task ${id}`);
        } catch (approvalError) {
          console.error(`Error creating step approval for task ${id}:`, approvalError);
        }
        console.log(`Step ${chainStep.id} requires approval. Task marked as completed but chain will not advance until approved.`);
        // We don't advance the chain - it will wait for approval
      } else {
        // No approval required, complete the chain step
        try {
          await this.completeChainStep(existingTask.chainAssignmentId, existingTask.chainStepId);
          console.log(`Successfully advanced chain for task ${id}`);
        } catch (error) {
          console.error(`Error advancing chain for task ${id}:`, error);
        }
      }
    }
  }
  
  return task;
}
  async deleteCareTask(id: number): Promise<void> {
    await db.delete(careTasks).where(eq(careTasks.id, id));
  }
  async getTaskTemplates(): Promise<TaskTemplate[]> {
    console.log('Fetching all task templates');
    try {
      const templates = await db.select()
        .from(taskTemplates)
        .orderBy(taskTemplates.id);

      console.log('Retrieved templates:', templates);
      return templates;
    } catch (error) {
      console.error('Error fetching task templates:', error);
      throw new Error('Failed to fetch task templates');
    }
  }
  async getTaskTemplate(id: number): Promise<TaskTemplate | undefined> {
    console.log('Fetching task template:', id);
    try {
      const [template] = await db.select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, id));
      return template;
    } catch (error) {
      console.error('Error fetching task template:', error);
      throw new Error('Failed to fetch task template');
    }
  }
  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    console.log('Creating task template:', template);
    try {
      const [newTemplate] = await db.insert(taskTemplates)
        .values({
          ...template,
          public: template.public ?? false,
          applyToAll: template.applyToAll ?? false,
          requiresExpertise: template.requiresExpertise ?? false,
        })
        .returning();
      return newTemplate;
    } catch (error) {
      console.error('Error creating task template:', error);
      throw new Error('Failed to create task template');
    }
  }
  async updateTaskTemplate(id: number, update: Partial<TaskTemplate>): Promise<TaskTemplate> {
    console.log('Updating task template:', id, update);
    try {
      const [template] = await db.update(taskTemplates)
        .set(update)
        .where(eq(taskTemplates.id, id))
        .returning();
      if (!template) throw new Error("Task template not found");
      return template;
    } catch (error) {
      console.error('Error updating task template:', error);
      throw new Error('Failed to update task template');
    }
  }
  async deleteTaskTemplate(id: number): Promise<void> {
    console.log('Deleting task template:', id);
    try {
      await db.delete(taskTemplates)
        .where(eq(taskTemplates.id, id));
    } catch (error) {
      console.error('Error deleting task template:', error);
      throw new Error('Failed to delete task template');
    }
  }
  async createTaskChain(chain: InsertTaskChain): Promise<TaskChain> {
    console.log('Creating task chain:', chain);
    try {
      const [newChain] = await db.insert(taskChains)
        .values({
          ...chain,
          createdAt: new Date(),
          isActive: true
        })
        .returning();
      return newChain;
    } catch (error) {
      console.error('Error creating task chain:', error);
      throw new Error('Failed to create task chain');
    }
  }
  async updateTaskChain(id: number, update: Partial<TaskChain>): Promise<TaskChain> {
    const [taskChain] = await db.update(taskChains)
      .set(update)
      .where(eq(taskChains.id, id))
      .returning();
    if (!taskChain) throw new Error("Task chain not found");
    return taskChain;
  }
  async deleteTaskChain(id: number): Promise<void> {
    console.log('Deleting task chain:', id);

    await db.transaction(async (tx) => {
      // First delete all steps associated with this chain
      const steps = await tx.select({ id: chainSteps.id }).from(chainSteps).where(eq(chainSteps.chainId, id));
      const stepIds = steps.map(step => step.id);

      await tx.delete(careTasks)
        .where(inArray(careTasks.chainStepId, stepIds));

      await tx.delete(chainSteps)
        .where(eq(chainSteps.chainId, id));

      await tx.delete(taskChains)
        .where(eq(taskChains.id, id));

      // Mark any active assignments as cancelled
      await tx.update(chainAssignments)
        .set({
          status: "cancelled",
          completedAt: new Date(),
          lastUpdated: new Date()
        })
        .where(and(
          eq(chainAssignments.chainId, id),
          eq(chainAssignments.status, "active")
        ));

      await tx.delete(chainAssignments)
        .where(eq(chainAssignments.chainId, id));
    });
  }
  async createChainStep(step: InsertChainStep): Promise<ChainStep> {
    console.log('Creating chain step:', step);
    try {
      const [newStep] = await db.insert(chainSteps)
        .values(step)
        .returning();
      return newStep;
    } catch (error) {
      console.error('Error creating chain step:', error);
      throw new Error('Failed to create chain step');
    }
  }
  async updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep> {
    const [chainStep] = await db.update(chainSteps)
      .set(update)
      .where(eq(chainSteps.id, id))
      .returning();
    if (!chainStep) throw new Error("Chain step not found");
    return chainStep;
  }
  async deleteChainStep(id: number): Promise<void> {
    console.log('Deleting chain step:', id);
    await db.delete(chainSteps).where(eq(chainSteps.id, id));
  }
  async getChainStep(id: number): Promise<ChainStep | undefined> {
    const [chainStep] = await db.select()
      .from(chainSteps)
      .where(eq(chainSteps.id, id));
    return chainStep;
  }
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
        console.log(`[Storage] Created first task for chain ${assignment.chainId}`);
        return updatedAssignment;
      }

      return newAssignment;
    });
  }
  async updateChainAssignment(id: number, update: Partial<ChainAssignment>): Promise<ChainAssignment> {
    const [chainAssignment] = await db.update(chainAssignments)
      .set(update)
      .where(eq(chainAssignments.id, id))
      .returning();
    if (!chainAssignment) throw new Error("Chain assignment not found");
    return chainAssignment;
  }
  async deleteChainAssignment(id: number): Promise<void> {
    console.log('Deleting chain assignment:', id);
    await db.delete(chainAssignments).where(eq(chainAssignments.id, id));
  }
  async getStepApprovals(assignmentId: number): Promise<StepApproval[]> {
    return db.select().from(stepApprovals).where(eq(stepApprovals.assignmentId, assignmentId));
  }
  async createStepApproval(approval: InsertStepApproval): Promise<StepApproval> {
    const [newApproval] = await db.insert(stepApprovals)
      .values(approval)
      .returning();
    return newApproval;
  }
  async deleteStepApproval(id: number): Promise<void> {
    console.log('Deleting step approval:', id);
    await db.delete(stepApprovals).where(eq(stepApprovals.id, id));
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
      isCompleted: sql<boolean>`false`, // Add isCompleted property
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
    templateName: string | null;
    templateDescription: string | null;
    isCompleted: boolean;
    careTaskId?: number | null;
  })[]> {

    console.log('Fetching steps with progress for chain:', chainId, 'assignment:', assignmentId);

    const stepsWithProgress = await db.select({
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
      careTaskId: careTasks.id,
      completed: careTasks.completed,
      isCompleted: sql<boolean>`false`, // Add isCompleted property
    })
      .from(chainSteps)
      .leftJoin(taskTemplates, eq(chainSteps.templateId, taskTemplates.id))
      .leftJoin(
        careTasks,
        and(
          eq(careTasks.chainStepId, chainSteps.id),
          eq(careTasks.chainAssignmentId, assignmentId)
        )
      )
      .where(eq(chainSteps.chainId, chainId))
      .orderBy(chainSteps.order);

    console.log('Retrieved steps with progress:', stepsWithProgress);

    // Get completed steps from assignment
    const [assignment] = await db.select()
      .from(chainAssignments)
      .where(eq(chainAssignments.id, assignmentId));

    const completedStepIds = assignment?.completedSteps || [];

    return stepsWithProgress.map(step => {
      return {
        ...step,
        templateName: step.templateName ?? null,
        templateDescription: step.templateDescription ?? null,
        isCompleted: step.completed || completedStepIds.includes(String(step.id)),
        careTaskId: step.careTaskId ?? null,
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

      // Mark current step's care task as completed
      await tx.update(careTasks)
        .set({
          completed: true,
          completedAt: new Date()
        })
        .where(and(
          eq(careTasks.chainAssignmentId, assignmentId),
          eq(careTasks.chainStepId, stepId)
        ));

      // Get completed steps array and add current step
      let completedSteps = assignment.completedSteps || [];
      if (!completedSteps.includes(String(stepId))) {
        completedSteps = [...completedSteps, String(stepId)];
      }
      const progressPercentage = Math.round((completedSteps.length / steps.length) * 100);

      // Create next step's task if available
      const nextStep = steps[currentStepIndex + 1];
      if (nextStep) {
        // Check if task already exists
        const [existingTask] = await tx.select()
          .from(careTasks)
          .where(and(
            eq(careTasks.chainAssignmentId, assignmentId),
            eq(careTasks.chainStepId, nextStep.id)
          ));

        if (!existingTask) {
          // Create task for next step
          await tx.insert(careTasks).values({
            plantId: assignment.plantId,
            templateId: nextStep.templateId,
            chainAssignmentId: assignmentId,
            chainStepId: nextStep.id,
            dueDate: new Date(Date.now() + (nextStep.waitDuration || 0) * 60 * 60 * 1000),
            completed: false,
            notes: `Part of chain: ${assignment.chainId}, step: ${currentStepIndex + 2}`,
            checklistProgress: {},
            stepOrder: currentStepIndex + 1
          });
        }

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

   async getTaskChains(): Promise<TaskChain[]> {
    return db.select().from(taskChains);
  }
  async getTaskChain(id: number): Promise<TaskChain | undefined> {
    const [taskChain] = await db.select()
      .from(taskChains)
      .where(eq(taskChains.id, id));
    return taskChain;
  }
   async getChainAssignments(plantId?: number): Promise<ChainAssignment[]> {
    let query: any = db.select().from(chainAssignments);

    if (plantId) {
      query = query.where(eq(chainAssignments.plantId, plantId));
    }

    return query;
  }
  async getChainAssignment(id: number): Promise<ChainAssignment | undefined> {
  console.log(`🔍 STORAGE: Looking up chain assignment ${id}`);
  
  // First try without any filtering - for debugging
  const allAssignments = await db.select().from(chainAssignments);
  console.log(`Total assignments in DB: ${allAssignments.length}`);
  
  const [chainAssignment] = await db.select()
    .from(chainAssignments)
    .where(eq(chainAssignments.id, id));
    
  console.log(`Result for assignment ${id}:`, chainAssignment);
  
  return chainAssignment;
}

  async getHealthRecords(plantId: number): Promise<HealthRecord[]> {
    return db.select().from(healthRecords).where(eq(healthRecords.plantId, plantId));
  }

  async getHealthRecord(id: number): Promise<HealthRecord | undefined> {
    const [healthRecord] = await db.select().from(healthRecords).where(eq(healthRecords.id, id));
    return healthRecord;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [newRecord] = await db.insert(healthRecords).values(record).returning();
    return newRecord;
  }

  async updateHealthRecord(id: number, update: Partial<HealthRecord>): Promise<HealthRecord> {
    const [healthRecord] = await db.update(healthRecords).set(update).where(eq(healthRecords.id, id)).returning();
    if (!healthRecord) throw new Error("Health record not found");
    return healthRecord;
  }

  async getChecklistItems(templateId: number): Promise<ChecklistItem[]> {
    return db.select().from(checklistItems).where(eq(checklistItems.templateId, templateId));
  }
  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const [newItem] = await db.insert(checklistItems).values(item).returning();
    return newItem;
  }
  async updateChecklistItem(id: number, update: Partial<ChecklistItem>): Promise<ChecklistItem> {
    const [checklistItem] = await db.update(checklistItems).set(update).where(eq(checklistItems.id, id)).returning();
    if (!checklistItem) throw new Error("Checklist item not found");
    return checklistItem;
  }
  async deleteChecklistItem(id: number): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.id, id));
  }

  async createTaskForChainStep(assignmentId: number, stepId: number): Promise<void> {
    console.log(`Creating task for chain step: assignmentId=${assignmentId}, stepId=${stepId}`);
  }
}

export const storage = new DatabaseStorage();
