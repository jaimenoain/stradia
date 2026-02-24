import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');
const TEST_SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.test.prisma');
const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'verify_market.db');

async function main() {
  try {
    console.log('Reading schema...');
    let schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    console.log('Modifying schema for SQLite...');
    // 1. Change provider
    schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');

    // 2. Change URL
    // This regex replaces url = ... line. It handles env("...") or string.
    schema = schema.replace(/url\s*=\s*.*/, 'url = "file:./verify_market.db"');

    // 3. Remove directUrl
    schema = schema.replace(/directUrl\s*=\s*.*/, '');

    // 4. Remove Enum UserRole definition
    // Regex to match `enum UserRole { ... }` block
    schema = schema.replace(/enum\s+UserRole\s+\{[\s\S]*?\}/, '');

    // 5. Change `role UserRole` to `role String`
    schema = schema.replace(/\brole\s+UserRole\b/g, 'role String');

    // Write test schema
    fs.writeFileSync(TEST_SCHEMA_PATH, schema);
    console.log(`Test schema written to ${TEST_SCHEMA_PATH}`);

    // Push DB
    console.log('Pushing database schema (sqlite)...');
    execSync(`npx prisma db push --schema ${TEST_SCHEMA_PATH}`, { stdio: 'inherit' });

    // Generate Client
    console.log('Generating Prisma Client...');
    execSync(`npx prisma generate --schema ${TEST_SCHEMA_PATH}`, { stdio: 'inherit' });

    // Run Test Logic
    console.log('Running test logic...');
    execSync(`npx tsx scripts/_verify_market_actions_logic.ts`, { stdio: 'inherit' });

    console.log('✅ Verification Successful');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('Cleaning up...');
    if (fs.existsSync(TEST_SCHEMA_PATH)) fs.unlinkSync(TEST_SCHEMA_PATH);
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(TEST_DB_PATH + '-journal')) fs.unlinkSync(TEST_DB_PATH + '-journal');

    // Restore original client
    console.log('Restoring original Prisma Client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to restore Prisma Client:', e);
    }
  }
}

main();
