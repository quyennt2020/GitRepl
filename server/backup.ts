import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { db } from './db';
import { sql } from 'drizzle-orm';

const execAsync = promisify(exec);

// Ensure backup directory exists
const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

export async function createBackup() {
  await ensureBackupDir();

  const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const {
    PGHOST,
    PGPORT,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
  } = process.env;

  try {
    // Create backup using pg_dump
    const command = `PGPASSWORD=${PGPASSWORD} pg_dump -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -F p -f ${filepath}`;
    await execAsync(command);

    console.log(`Backup created successfully: ${filename}`);
    return filepath;
  } catch (error) {
    console.error('Backup creation failed:', error);
    throw new Error('Failed to create backup');
  }
}

export async function restoreBackup(backupPath: string) {
  if (!backupPath.endsWith('.sql')) {
    throw new Error('Invalid backup file format. Expected .sql file');
  }

  try {
    await fs.access(backupPath);
  } catch {
    throw new Error('Backup file not found');
  }

  const {
    PGHOST,
    PGPORT,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
  } = process.env;

  try {
    // First, drop all existing connections
    await db.execute(sql`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = ${PGDATABASE}
      AND pid <> pg_backend_pid();
    `);

    // Restore from backup
    const command = `PGPASSWORD=${PGPASSWORD} psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -f ${backupPath}`;
    await execAsync(command);

    console.log('Database restored successfully');
  } catch (error) {
    console.error('Database restoration failed:', error);
    throw new Error('Failed to restore database');
  }
}

export async function listBackups() {
  await ensureBackupDir();

  try {
    const files = await fs.readdir(BACKUP_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .map(file => ({
        filename: file,
        path: path.join(BACKUP_DIR, file),
        timestamp: file.replace('backup-', '').replace('.sql', '')
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error('Failed to list backups:', error);
    throw new Error('Failed to list backups');
  }
}