import { Plant, InsertPlant, CareTask, InsertCareTask, HealthRecord, InsertHealthRecord,
  TaskTemplate, InsertTaskTemplate, ChecklistItem, InsertChecklistItem,
  TaskChain, InsertTaskChain, ChainStep, InsertChainStep,
  ChainAssignment, InsertChainAssignment, StepApproval, InsertStepApproval,
  plants, careTasks, healthRecords, taskTemplates, checklistItems,
  taskChains, chainSteps, chainAssignments, stepApprovals } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  // ... [Interface definitions remain unchanged]
}

export class DatabaseStorage implements IStorage {
  // ... [Other methods remain unchanged]

  async getChainSteps(chainId: number): Promise<ChainStep[]> {
    console.log(`[Storage] Fetching steps for chain ${chainId}`);

    // First check if chain exists
    const chainExists = await db
      .select({ id: taskChains.id })
      .from(taskChains)
      .where(eq(taskChains.id, chainId))
      .limit(1);

    if (!chainExists.length) {
      console.error(`[Storage] Chain with ID ${chainId} not found`);
      return []; // Return empty array rather than throwing
    }

    // Join with templates to get names and ensure proper chainId filtering
    const steps = await db
      .select({
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

    console.log(`[Storage] Retrieved ${steps.length} steps for chain ${chainId}:`, steps);
    return steps;
  }

  async createChainStep(step: InsertChainStep): Promise<ChainStep> {
    console.log(`[Storage] Creating new step for chain ${step.chainId}`, step);

    // Verify chain exists before creating step
    const chainExists = await db
      .select({ id: taskChains.id })
      .from(taskChains)
      .where(eq(taskChains.id, step.chainId))
      .limit(1);

    if (!chainExists.length) {
      throw new Error(`Cannot create step: Chain with ID ${step.chainId} not found`);
    }

    const [newStep] = await db
      .insert(chainSteps)
      .values(step)
      .returning();

    console.log(`[Storage] Created new step:`, newStep);
    return newStep;
  }

  async updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep> {
    console.log(`[Storage] Updating step ${id}`, update);

    const [step] = await db
      .update(chainSteps)
      .set(update)
      .where(eq(chainSteps.id, id))
      .returning();

    if (!step) throw new Error("Chain step not found");

    console.log(`[Storage] Updated step:`, step);
    return step;
  }

  async deleteChainStep(id: number): Promise<void> {
    console.log(`[Storage] Deleting step ${id}`);
    await db.delete(chainSteps).where(eq(chainSteps.id, id));
  }
}

export const storage = new DatabaseStorage();