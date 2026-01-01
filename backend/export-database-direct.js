// Direct Database Export using better-sqlite3
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const exportDir = path.join(__dirname, '..', 'database-export');
const sqlFile = path.join(exportDir, 'import-all-data.sql');

if (!fs.existsSync(dbPath)) {
    console.error('Database file not found:', dbPath);
    process.exit(1);
}

// Create export directory
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
}

console.log('==========================================');
console.log('  Export Local Database Data');
console.log('==========================================\n');
console.log('Database:', dbPath);
console.log('Export to:', sqlFile);
console.log('');

const db = new Database(dbPath);

try {
    // Get all tables
    const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE '_%'
        ORDER BY name
    `).all();

    console.log(`Found ${tables.length} tables\n`);

    let sqlContent = `-- Database Migration: Import All Data\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += `-- Source: ${dbPath}\n\n`;
    sqlContent += `BEGIN TRANSACTION;\n\n`;

    let exportedCount = 0;

    for (const table of tables) {
        const tableName = table.name;
        console.log(`Exporting: ${tableName}`);

        try {
            const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();

            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                
                sqlContent += `-- Table: ${tableName}\n`;
                sqlContent += `-- Rows: ${rows.length}\n\n`;

                for (const row of rows) {
                    const values = columns.map(col => {
                        const value = row[col];
                        if (value === null || value === undefined) {
                            return 'NULL';
                        } else if (typeof value === 'string') {
                            return `'${value.replace(/'/g, "''")}'`;
                        } else if (value instanceof Date) {
                            return `'${value.toISOString()}'`;
                        } else {
                            return `'${String(value).replace(/'/g, "''")}'`;
                        }
                    });

                    sqlContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
                }

                sqlContent += `\n`;
                console.log(`  ✓ Exported ${rows.length} rows`);
                exportedCount++;
            } else {
                console.log(`  ! Table is empty, skipping`);
            }
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
        }
    }

    sqlContent += `COMMIT;\n`;

    fs.writeFileSync(sqlFile, sqlContent, 'utf8');
    console.log(`\n✓ Export complete: ${sqlFile}`);
    console.log(`Exported ${exportedCount} tables with data\n`);

    console.log('==========================================');
    console.log('  Export Complete!');
    console.log('==========================================\n');
    console.log('Next steps:');
    console.log('  1. Upload database-export/ folder to /var/www/Upload/');
    console.log('  2. On server, run the migration script\n');

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
} finally {
    db.close();
}

