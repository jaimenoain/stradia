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

// Helper to check for model existence
const checkModel = (modelName: string) => {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{`);
  if (!regex.test(schemaContent)) {
    console.error(`❌ Missing model: ${modelName}`);
    hasErrors = true;
    return false;
  }
  console.log(`✅ Model found: ${modelName}`);
  return true;
};

// Helper to check for field existence within a model
const checkField = (modelName: string, fieldName: string, fieldType?: string) => {
  // stricter regex to find the model block first
  const modelBlockRegex = new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\}`, 'm');
  const match = schemaContent.match(modelBlockRegex);

  if (!match) {
    // Already logged missing model
    return;
  }

  const blockContent = match[1];
  // Simple check: look for "fieldName fieldType" or just "fieldName"
  // We handle optional types (String?) and arrays (User[]) by allowing extra chars
  const fieldRegex = new RegExp(`\\s+${fieldName}\\s+${fieldType ? fieldType.replace('?', '\\?').replace('[]', '\\[\\]') : ''}`);

  if (!fieldRegex.test(blockContent)) {
    console.error(`❌ Missing field in ${modelName}: ${fieldName} ${fieldType || ''}`);
    hasErrors = true;
  } else {
    // console.log(`  ✅ Field found: ${fieldName}`);
  }
};

// 1. Verify Tenant
if (checkModel('Tenant')) {
  checkField('Tenant', 'id', 'String');
  checkField('Tenant', 'name', 'String');
  checkField('Tenant', 'stripe_customer_id', 'String?');
  checkField('Tenant', 'active_markets_limit', 'Int');
  checkField('Tenant', 'user_seat_limit', 'Int');
  checkField('Tenant', 'ai_token_quota', 'Int');
  checkField('Tenant', 'ai_tokens_used', 'Int');
  checkField('Tenant', 'token_reset_date', 'DateTime?');
  checkField('Tenant', 'is_active', 'Boolean');
  checkField('Tenant', 'created_at', 'DateTime');
  // Check relations
  checkField('Tenant', 'users', 'User[]');
  checkField('Tenant', 'markets', 'Market[]');
}

// 2. Verify User
if (checkModel('User')) {
  checkField('User', 'id', 'String');
  checkField('User', 'tenant_id', 'String');
  checkField('User', 'email', 'String');
  checkField('User', 'password_hash', 'String');
  checkField('User', 'role', 'UserRole');
  checkField('User', 'language_preference', 'String');
  checkField('User', 'last_login_at', 'DateTime?');
  // Check relations
  checkField('User', 'tenant', 'Tenant');
  checkField('User', 'markets', 'UserMarket[]');
}

// 3. Verify Market
if (checkModel('Market')) {
  checkField('Market', 'id', 'String');
  checkField('Market', 'tenant_id', 'String');
  checkField('Market', 'name', 'String');
  checkField('Market', 'region_code', 'String');
  checkField('Market', 'timezone', 'String');
  checkField('Market', 'is_active', 'Boolean');
  checkField('Market', 'deleted_at', 'DateTime?');
  // Check relations
  checkField('Market', 'tenant', 'Tenant');
  checkField('Market', 'users', 'UserMarket[]');
}

// 4. Verify UserMarket
if (checkModel('UserMarket')) {
  checkField('UserMarket', 'user_id', 'String');
  checkField('UserMarket', 'market_id', 'String');
  // Check relations
  checkField('UserMarket', 'user', 'User');
  checkField('UserMarket', 'market', 'Market');
}

// 5. Verify UserRole Enum
const enumName = 'UserRole';
const enumRegex = new RegExp(`enum\\s+${enumName}\\s+\\{([\\s\\S]*?)\\}`, 'm');
const enumMatch = schemaContent.match(enumRegex);
if (!enumMatch) {
  console.error(`❌ Missing enum: ${enumName}`);
  hasErrors = true;
} else {
  console.log(`✅ Enum found: ${enumName}`);
  const enumBody = enumMatch[1];
  ['GLOBAL_ADMIN', 'SUPERVISOR', 'LOCAL_USER', 'READ_ONLY'].forEach(val => {
    if (!enumBody.includes(val)) {
      console.error(`❌ Missing enum value in ${enumName}: ${val}`);
      hasErrors = true;
    }
  });
}

if (hasErrors) {
  console.error('❌ Schema verification failed due to missing entities or fields.');
  process.exit(1);
}

// Run prisma validate
try {
  console.log('Running prisma validate...');
  execSync('npx prisma validate', { stdio: 'inherit' });
  console.log('✅ prisma validate passed.');
} catch (e) {
  console.error('❌ prisma validate failed.');
  process.exit(1);
}

console.log('✅ Schema verification completed successfully.');
process.exit(0);
