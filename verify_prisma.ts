import fs from 'fs';
import path from 'path';

console.log('Verifying Prisma Setup...');

let hasErrors = false;

// 1. Check package.json dependencies
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const devDeps = packageJson.devDependencies || {};
    const deps = packageJson.dependencies || {};

    if (!devDeps['prisma']) {
        console.error('❌ "prisma" is missing in devDependencies.');
        hasErrors = true;
    } else {
        console.log('✅ "prisma" found in devDependencies.');
    }

    if (!deps['@prisma/client']) {
        console.error('❌ "@prisma/client" is missing in dependencies.');
        hasErrors = true;
    } else {
        console.log('✅ "@prisma/client" found in dependencies.');
    }
} else {
    console.error('❌ package.json not found.');
    hasErrors = true;
}

// 2. Check prisma/schema.prisma
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
    console.error('❌ prisma/schema.prisma not found.');
    hasErrors = true;
} else {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    const providerRegex = /provider\s+=\s+"postgresql"/;
    if (!providerRegex.test(schemaContent)) {
        console.error('❌ schema.prisma missing provider = "postgresql".');
        hasErrors = true;
    }

    const urlRegex = /url\s+=\s+env\("DATABASE_URL"\)/;
    if (!urlRegex.test(schemaContent)) {
        console.error('❌ schema.prisma missing url = env("DATABASE_URL").');
        hasErrors = true;
    }

    const directUrlRegex = /directUrl\s+=\s+env\("DIRECT_URL"\)/;
    if (!directUrlRegex.test(schemaContent)) {
        console.error('❌ schema.prisma missing directUrl = env("DIRECT_URL").');
        hasErrors = true;
    }

    console.log('✅ prisma/schema.prisma configuration verified.');
}

// 3. Check .env.example
const envExamplePath = path.join(process.cwd(), '.env.example');
if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example not found.');
    hasErrors = true;
} else {
    const envContent = fs.readFileSync(envExamplePath, 'utf-8');

    if (!envContent.includes('DATABASE_URL=')) {
        console.error('❌ .env.example missing DATABASE_URL.');
        hasErrors = true;
    }

    if (!envContent.includes('DIRECT_URL=')) {
        console.error('❌ .env.example missing DIRECT_URL.');
        hasErrors = true;
    }

    if (envContent.includes('DATABASE_URL=') && envContent.includes('DIRECT_URL=')) {
        console.log('✅ .env.example configuration verified.');
    }
}

// 4. Check lib/prisma.ts
const libPrismaPath = path.join(process.cwd(), 'lib', 'prisma.ts');
if (!fs.existsSync(libPrismaPath)) {
    console.error('❌ lib/prisma.ts not found.');
    hasErrors = true;
} else {
    console.log('✅ lib/prisma.ts found.');
}

if (hasErrors) {
    console.error('\n❌ Verification FAILED.');
    process.exit(1);
} else {
    console.log('\n✅ Verification PASSED.');
    process.exit(0);
}
