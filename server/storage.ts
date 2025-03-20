import { Plant, InsertPlant, CareTask, InsertCareTask, HealthRecord, InsertHealthRecord,
  TaskTemplate, InsertTaskTemplate, ChecklistItem, InsertChecklistItem,
  TaskChain, InsertTaskChain, ChainStep, InsertChainStep,
  ChainAssignment, InsertChainAssignment, StepApproval, InsertStepApproval,
  plants, careTasks, healthRecords, taskTemplates, checklistItems,
  taskChains, chainSteps, chainAssignments, stepApprovals } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  // ... [Interface definitions would go here if present in original, but are absent]
}

export class DatabaseStorage implements IStorage {
  // ... [Methods would go here if present in original, but are absent]

  async getChainSteps(chainId: number): Promise<ChainStep[]> {
    console.log(`Fetching steps for chain ${chainId}`);

    // First check if chain exists
    const chainExists = await db
      .select({ id: taskChains.id })
      .from(taskChains)
      .where(eq(taskChains.id, chainId))
      .limit(1);

    if (!chainExists.length) {
      console.error(`Chain with ID ${chainId} not found`);
      return []; // Return empty array rather than throwing
    }

    // Join with templates to get names
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
        templateCategory: taskTemplates.category,
        templateDescription: taskTemplates.description,
      })
      .from(chainSteps)
      .leftJoin(taskTemplates, eq(chainSteps.templateId, taskTemplates.id))
      .where(eq(chainSteps.chainId, chainId))
      .orderBy(chainSteps.order);

    console.log(`Retrieved ${steps.length} steps for chain ${chainId}:`, steps);
    return steps;
  }

  async createChainStep(step: InsertChainStep): Promise<ChainStep> {
    const [newStep] = await db
      .insert(chainSteps)
      .values(step)
      .returning();

    console.log(`Created new step for chain ${step.chainId}:`, newStep);
    return newStep;
  }

  async updateChainStep(id: number, update: Partial<ChainStep>): Promise<ChainStep> {
    const [step] = await db
      .update(chainSteps)
      .set(update)
      .where(eq(chainSteps.id, id))
      .returning();
    if (!step) throw new Error("Chain step not found");
    return step;
  }

  async deleteChainStep(id: number): Promise<void> {
    console.log(`Deleting step ${id}`);
    await db.delete(chainSteps).where(eq(chainSteps.id, id));
  }

  // ... [Placeholder for other methods.  The original file lacked these.]
}

export const storage = new DatabaseStorage();