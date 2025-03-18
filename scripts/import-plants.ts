import { parse } from 'csv-parse';
import fs from 'fs/promises';
import { db } from '../server/db';
import { plants, type InsertPlant } from '../shared/schema';
import { format } from 'date-fns';

async function importPlantsFromCSV(filepath: string) {
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

    for (const [index, record] of records.entries()) {
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

        // Insert into database
        await db.insert(plants).values(plantData);
        results.success++;
        console.log(`Imported plant: ${plantData.name}`);

      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${index + 1} (${record.name}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Generate report
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const reportPath = `import-report-${timestamp}.txt`;

    const report = [
      `Import Report (${timestamp})`,
      `Total records processed: ${records.length}`,
      `Successfully imported: ${results.success}`,
      `Failed to import: ${results.failed}`,
      '',
      'Errors:',
      ...results.errors
    ].join('\n');

    await fs.writeFile(reportPath, report);

    console.log(`
Import completed:
- Successfully imported: ${results.success}
- Failed to import: ${results.failed}
- Detailed report saved to: ${reportPath}
    `);

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Check if file path is provided
if (process.argv.length < 3) {
  console.error('Please provide the path to the CSV file');
  console.error('Usage: tsx scripts/import-plants.ts <csv-file>');
  process.exit(1);
}

// Run import
importPlantsFromCSV(process.argv[2]);