// Export Database to SQL using Node.js
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const exportDir = path.join(__dirname, 'database-export');
const sqlFile = path.join(exportDir, 'import-all-data.sql');

// Create export directory
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
}

async function exportDatabase() {
    console.log('==========================================');
    console.log('  Export Local Database Data');
    console.log('==========================================\n');

    try {
        // Get all tables
        const tables = await prisma.$queryRaw`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name NOT LIKE 'sqlite_%' 
            AND name NOT LIKE '_%'
            ORDER BY name
        `;

        console.log(`Found ${tables.length} tables\n`);

        // Start SQL file
        let sqlContent = `-- Database Migration: Import All Data\n`;
        sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
        sqlContent += `-- Source: Local Database\n\n`;
        sqlContent += `BEGIN TRANSACTION;\n\n`;

        let exportedCount = 0;

        for (const table of tables) {
            const tableName = table.name;
            console.log(`Exporting: ${tableName}`);

            try {
                // Get all data from table
                const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);

                if (data.length > 0) {
                    // Get column names
                    const columns = Object.keys(data[0]);
                    
                    sqlContent += `-- Table: ${tableName}\n`;
                    sqlContent += `-- Rows: ${data.length}\n\n`;

                    // Generate INSERT statements
                    for (const row of data) {
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
                    console.log(`  ✓ Exported ${data.length} rows`);
                    exportedCount++;
                } else {
                    console.log(`  ! Table is empty, skipping`);
                }
            } catch (error) {
                console.log(`  ✗ Error exporting ${tableName}: ${error.message}`);
            }
        }

        sqlContent += `COMMIT;\n`;

        // Write SQL file
        fs.writeFileSync(sqlFile, sqlContent, 'utf8');
        console.log(`\n✓ Export complete: ${sqlFile}`);
        console.log(`Exported ${exportedCount} tables with data\n`);

        // Copy import script
        const importScript = path.join(__dirname, 'import-database-server.sh');
        if (fs.existsSync(importScript)) {
            fs.copyFileSync(importScript, path.join(exportDir, 'import-to-server.sh'));
            console.log('✓ Import script copied\n');
        }

        console.log('==========================================');
        console.log('  Export Complete!');
        console.log('==========================================\n');
        console.log('Files created:');
        console.log(`  - ${sqlFile}`);
        console.log(`  - ${path.join(exportDir, 'import-to-server.sh')}\n`);
        console.log('To import on server:');
        console.log('  1. Upload database-export/ folder to /var/www/Upload/');
        console.log('  2. Run: cd /var/www/Upload/database-export && bash import-to-server.sh\n');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

exportDatabase();

