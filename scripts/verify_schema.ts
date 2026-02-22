import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');

console.log('Verifying Prisma Schema...');

if (!fs.existsSync(SCHEMA_PATH)) {
  console.error('❌ prisma/schema.prisma not found.');
  process.exit(1);
}

const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
let hasErrors = false;

// Check for required models
const requiredModels = ['Tenant', 'User', 'Market', 'UserMarket'];
requiredModels.forEach((model) => {
  const modelRegex = new RegExp(`model\\s+${model}\\s+\\{`);
  if (!modelRegex.test(schemaContent)) {
    console.error(`❌ Missing model: ${model}`);
    hasErrors = true;
  } else {
    console.log(`✅ Model found: ${model}`);
  }
});

// Check for required enum
const requiredEnums = ['UserRole'];
requiredEnums.forEach((enumName) => {
  const enumRegex = new RegExp(`enum\\s+${enumName}\\s+\\{`);
  if (!enumRegex.test(schemaContent)) {
    console.error(`❌ Missing enum: ${enumName}`);
    hasErrors = true;
  } else {
    console.log(`✅ Enum found: ${enumName}`);
  }
});

if (hasErrors) {
  console.error('❌ Schema verification failed due to missing entities.');
  process.exit(1);
}

// Run prisma validate
try {
  console.log('Running prisma validate...');
  execSync('npx prisma validate', { stdio: 'inherit' });
  console.log('✅ prisma validate passed.');
} catch {
  console.error('❌ prisma validate failed.');
  process.exit(1);
}

console.log('✅ Schema verification completed successfully.');
process.exit(0);
