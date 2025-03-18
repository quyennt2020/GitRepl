import { createBackup } from '../server/backup';

async function main() {
  try {
    const backupPath = await createBackup();
    console.log(`Backup created successfully at: ${backupPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

main();
