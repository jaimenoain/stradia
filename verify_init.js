const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkFileExists(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return false;
  }
  console.log(`✅ File found: ${filepath}`);
  return true;
}

function checkDirectoryExists(dirpath) {
  if (!fs.existsSync(dirpath) || !fs.statSync(dirpath).isDirectory()) {
    console.error(`❌ Directory not found: ${dirpath}`);
    return false;
  }
  console.log(`✅ Directory found: ${dirpath}`);
  return true;
}

function checkTsConfigStrict() {
  try {
    const tsconfigPath = path.join(__dirname, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      console.error('❌ tsconfig.json not found');
      return false;
    }
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict === true) {
      console.log('✅ tsconfig.json has "strict": true');
      return true;
    } else {
      console.error('❌ tsconfig.json does not have "strict": true');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking tsconfig.json: ${error.message}`);
    return false;
  }
}

function runBuildCheck() {
  try {
    console.log('Running build check (npx tsc --noEmit)...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ Build check passed');
    return true;
  } catch (error) {
    console.error('❌ Build check failed');
    return false;
  }
}

function main() {
  let passed = true;

  console.log('Verifying initialization...');

  passed = checkDirectoryExists('.git') && passed;
  passed = checkDirectoryExists('app') && passed;
  passed = checkTsConfigStrict() && passed;

  // Check for ESLint config (could be .eslintrc.json, .eslintrc.js, or eslint.config.mjs)
  const eslintConfigExists = [
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc.yml',
    '.eslintrc.yaml',
    'eslint.config.js',
    'eslint.config.mjs'
  ].some(file => fs.existsSync(path.join(__dirname, file)));

  if (eslintConfigExists) {
    console.log('✅ ESLint configuration found');
  } else {
    console.error('❌ ESLint configuration not found');
    passed = false;
  }

  // Check for Prettier config
  const prettierConfigExists = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    'prettier.config.js',
    '.prettierrc.yaml',
    '.prettierrc.yml'
  ].some(file => fs.existsSync(path.join(__dirname, file)));

  if (prettierConfigExists) {
    console.log('✅ Prettier configuration found');
  } else {
    console.error('❌ Prettier configuration not found');
    passed = false;
  }

  passed = checkDirectoryExists('docs') && passed;
  passed = checkFileExists('.ai-status.md') && passed;

  if (passed) {
      // Only run build check if structure is correct
      passed = runBuildCheck() && passed;
  }

  if (passed) {
    console.log('\n🎉 Verification SUCCESS!');
    process.exit(0);
  } else {
    console.error('\n💥 Verification FAILED!');
    process.exit(1);
  }
}

main();
