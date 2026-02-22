const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components/ui');
const requiredFiles = [
  'button.tsx',
  'input.tsx',
  'card.tsx',
  'alert.tsx',
  'toast.tsx',
  'toaster.tsx',
  'table.tsx',
  'resizable.tsx',
];

let failed = false;

// Check if components directory exists
if (!fs.existsSync(componentsDir)) {
  console.error(`ERROR: Directory '${componentsDir}' does not exist.`);
  failed = true;
} else {
  // Check for each required file
  for (const file of requiredFiles) {
    const filePath = path.join(componentsDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: Required component file '${file}' is missing in '${componentsDir}'.`);
      failed = true;
    } else {
      console.log(`PASS: Found component file '${file}'.`);
    }
  }
}

// Check package.json for lucide-react
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error(`ERROR: 'package.json' not found.`);
  failed = true;
} else {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies || {};
  if (!dependencies['lucide-react']) {
    console.error(`ERROR: 'lucide-react' is not listed in dependencies.`);
    failed = true;
  } else {
    console.log(`PASS: 'lucide-react' found in dependencies.`);
  }
}

if (failed) {
  console.error('VERIFICATION FAILED: Missing required primitives or dependencies.');
  process.exit(1);
} else {
  console.log('VERIFICATION PASSED: All required primitives and dependencies are present.');
  process.exit(0);
}
