import { parse } from 'csv-parse';
import fs from 'fs/promises';
import { db } from './db';
import { plants, type InsertPlant } from '@shared/schema';

export async function importPlantsFromCSV(filepath: string) {
  try {
    // Read CSV file
    const fileContent = await fs.readFile(filepath, 'utf-8');

    // Parse CSV data
    const records = await new Promise<any[]>((resolve, reject) => {
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    console.log(`Found ${records.length} records in CSV`);

    // Process each record
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Use standard for loop instead of entries() to avoid TypeScript issues
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Transform CSV data to match our schema
        const plantData: InsertPlant = {
          name: record.name,
          species: record.species,
          image: record.image || 'https://placehold.co/400x400?text=Plant',
          location: record.location || 'Unknown',
          wateringInterval: parseInt(record.wateringInterval) || 7,
          fertilizingInterval: parseInt(record.fertilizingInterval) || 30,
          sunlight: (record.sunlight?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high',
          notes: record.notes || '',
          position: record.position || null,
        };

        // Validate required fields
        if (!plantData.name || !plantData.species || !record.wateringInterval) {
          throw new Error('Missing required fields: name, species, or wateringInterval');
        }

        // Insert into database
        await db.insert(plants).values(plantData);
        results.success++;
        console.log(`Imported plant: ${plantData.name}`);

      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${i + 1} (${record.name || 'Unknown'}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      total: records.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    };

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}