const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'tailwind.config.ts');
const cssPath = path.join(__dirname, 'app', 'globals.css');

function verify() {
  let errors = [];

  if (!fs.existsSync(configPath)) {
    errors.push('tailwind.config.ts not found');
  } else {
    const configContent = fs.readFileSync(configPath, 'utf8');
    if (!configContent.includes('success:')) errors.push('tailwind.config.ts missing success color');
    if (!configContent.includes('warning:')) errors.push('tailwind.config.ts missing warning color');
    if (!configContent.includes('destructive:')) errors.push('tailwind.config.ts missing destructive color');
    // Check for Inter font configuration (e.g., in fontFamily)
    if (!configContent.includes('Inter')) errors.push('tailwind.config.ts missing Inter font family');
  }

  if (!fs.existsSync(cssPath)) {
    errors.push('app/globals.css not found');
  } else {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    if (!cssContent.includes('--success:')) errors.push('app/globals.css missing --success variable');
    if (!cssContent.includes('--warning:')) errors.push('app/globals.css missing --warning variable');
    if (!cssContent.includes('--destructive:')) errors.push('app/globals.css missing --destructive variable');
    if (!cssContent.includes('--background:')) errors.push('app/globals.css missing --background variable');
    if (!cssContent.includes('--foreground:')) errors.push('app/globals.css missing --foreground variable');
  }

  if (errors.length > 0) {
    console.error('Verification Failed:');
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  } else {
    console.log('Verification Passed!');
  }
}

verify();
