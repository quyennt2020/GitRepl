import * as XLSX from 'xlsx';
import { plants, taskTemplates, careTasks, healthRecords, checklistItems } from '@shared/schema';
import { insertPlantSchema, insertTaskTemplateSchema, insertCareTaskSchema, insertHealthRecordSchema, insertChecklistItemSchema } from '@shared/schema';
import type { Plant, TaskTemplate, CareTask, HealthRecord, ChecklistItem } from '@shared/schema';
import { storage } from '../storage';

// Mapping of table names to their respective data
const TABLE_MAPPINGS = {
  'Plants': plants,
  'Task Templates': taskTemplates,
  'Care Tasks': careTasks,
  'Health Records': healthRecords,
  'Checklist Items': checklistItems
};

export async function exportToExcel(): Promise<Buffer> {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  try {
    // Export each table to its own sheet
    const allPlants = await storage.getPlants();
    const plantsSheet = XLSX.utils.json_to_sheet(allPlants);
    XLSX.utils.book_append_sheet(workbook, plantsSheet, 'Plants');

    const allTemplates = await storage.getTaskTemplates();
    const templatesSheet = XLSX.utils.json_to_sheet(allTemplates);
    XLSX.utils.book_append_sheet(workbook, templatesSheet, 'Task Templates');

    const allTasks = await storage.getCareTasks();
    const tasksSheet = XLSX.utils.json_to_sheet(allTasks);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Care Tasks');

    const allHealthRecords = await storage.getAllHealthRecords();
    const healthSheet = XLSX.utils.json_to_sheet(allHealthRecords);
    XLSX.utils.book_append_sheet(workbook, healthSheet, 'Health Records');

    const allChecklistItems = await storage.getAllChecklistItems();
    const checklistSheet = XLSX.utils.json_to_sheet(allChecklistItems);
    XLSX.utils.book_append_sheet(workbook, checklistSheet, 'Checklist Items');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export data to Excel');
  }
}

type ValidationResult<T> = {
  valid: boolean;
  data?: T;
  error?: string;
};

function validateExcelRow<T>(schema: typeof insertPlantSchema | typeof insertTaskTemplateSchema | typeof insertCareTaskSchema | typeof insertHealthRecordSchema | typeof insertChecklistItemSchema, row: unknown): ValidationResult<T> {
  try {
    // Convert data types if needed
    const processedRow = Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([key, value]) => {
        // Special handling for each schema type
        if (schema === insertPlantSchema) {
          if (key === 'sunlight') {
            const sunlight = String(value).toLowerCase();
            if (!['low', 'medium', 'high'].includes(sunlight)) {
              throw new Error('Invalid sunlight value. Must be low, medium, or high.');
            }
            return [key, sunlight];
          }
        }
        if (schema === insertTaskTemplateSchema) {
          if (key === 'category') {
            const category = String(value).toLowerCase();
            if (!['water', 'fertilize', 'prune', 'check', 'repot', 'clean'].includes(category)) {
              throw new Error('Invalid category value.');
            }
            return [key, category];
          }
          if (key === 'priority') {
            const priority = String(value).toLowerCase();
            if (!['low', 'medium', 'high'].includes(priority)) {
              throw new Error('Invalid priority value. Must be low, medium, or high.');
            }
            return [key, priority];
          }
          if (key === 'public' || key === 'applyToAll' || key === 'requiresExpertise') {
            return [key, Boolean(value)];
          }
        }
        if (schema === insertCareTaskSchema) {
          if (key === 'checklistProgress') {
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' && parsed !== null) {
                  return [key, Object.fromEntries(
                    Object.entries(parsed).map(([k, v]) => [k, Boolean(v)])
                  )];
                }
              } catch {
                return [key, {}];
              }
            }
            return [key, value || {}];
          }
          if (key === 'completed') {
            return [key, Boolean(value)];
          }
          if (key === 'dueDate') {
            return [key, new Date(String(value))];
          }
        }
        if (schema === insertHealthRecordSchema && key === 'issues') {
          if (Array.isArray(value)) {
            return [key, value.map(String)];
          }
          if (typeof value === 'string') {
            return [key, value.split(',').map(i => i.trim()).filter(Boolean)];
          }
          return [key, []];
        }
        return [key, value];
      })
    );

    const result = schema.safeParse(processedRow);
    if (result.success) {
      return { valid: true, data: result.data as T };
    } else {
      return { valid: false, error: result.error.message };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown validation error' };
  }
}

export async function importFromExcel(buffer: Buffer): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, { processed: number; errors: string[] }>;
}> {
  try {
    const workbook = XLSX.read(buffer);
    const result: Record<string, { processed: number; errors: string[] }> = {};

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      result[sheetName] = { processed: 0, errors: [] };

      try {
        switch (sheetName) {
          case 'Plants':
            for (const row of data) {
              const validation = validateExcelRow<Plant>(insertPlantSchema, row);
              if (validation.valid && validation.data) {
                try {
                  await storage.createPlant(validation.data);
                  result[sheetName].processed++;
                } catch (err) {
                  result[sheetName].errors.push(`Error processing plant: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
              } else {
                result[sheetName].errors.push(`Validation error: ${validation.error}`);
              }
            }
            break;

          case 'Task Templates':
            for (const row of data) {
              const validation = validateExcelRow<TaskTemplate>(insertTaskTemplateSchema, row);
              if (validation.valid && validation.data) {
                try {
                  await storage.createTaskTemplate(validation.data);
                  result[sheetName].processed++;
                } catch (err) {
                  result[sheetName].errors.push(`Error processing template: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
              } else {
                result[sheetName].errors.push(`Validation error: ${validation.error}`);
              }
            }
            break;

          case 'Care Tasks':
            for (const row of data) {
              const validation = validateExcelRow<CareTask>(insertCareTaskSchema, row);
              if (validation.valid && validation.data) {
                try {
                  await storage.createCareTask(validation.data);
                  result[sheetName].processed++;
                } catch (err) {
                  result[sheetName].errors.push(`Error processing task: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
              } else {
                result[sheetName].errors.push(`Validation error: ${validation.error}`);
              }
            }
            break;

          case 'Health Records':
            for (const row of data) {
              const validation = validateExcelRow<HealthRecord>(insertHealthRecordSchema, row);
              if (validation.valid && validation.data) {
                try {
                  await storage.createHealthRecord(validation.data);
                  result[sheetName].processed++;
                } catch (err) {
                  result[sheetName].errors.push(`Error processing health record: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
              } else {
                result[sheetName].errors.push(`Validation error: ${validation.error}`);
              }
            }
            break;

          case 'Checklist Items':
            for (const row of data) {
              const validation = validateExcelRow<ChecklistItem>(insertChecklistItemSchema, row);
              if (validation.valid && validation.data) {
                try {
                  await storage.createChecklistItem(validation.data);
                  result[sheetName].processed++;
                } catch (err) {
                  result[sheetName].errors.push(`Error processing checklist item: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
              } else {
                result[sheetName].errors.push(`Validation error: ${validation.error}`);
              }
            }
            break;
        }
      } catch (err) {
        result[sheetName].errors.push(`Error processing sheet ${sheetName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const hasErrors = Object.values(result).some(r => r.errors.length > 0);
    return {
      success: !hasErrors,
      message: hasErrors ? 'Import completed with some errors' : 'Import completed successfully',
      details: result
    };

  } catch (error) {
    console.error('Error importing from Excel:', error);
    throw new Error('Failed to import data from Excel');
  }
}