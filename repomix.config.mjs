import fs from 'node:fs';

const aiStatus = fs.readFileSync('.ai-status.md', 'utf-8');

/** @type {import('repomix').RepomixConfig} */
export default {
  output: {
    style: 'xml',
    showLineNumbers: true,
    removeEmptyLines: true,
    // instructionFilePath: '.ai-status.md', // Replaced by headerText to ensure top placement
    headerText: aiStatus,
    fileSummary: false,
  },
  ignore: {
    customPatterns: [
      ".next/",
      "out/",
      "build/",
      "public/",
      "images/",
      "fonts/",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml"
    ]
  },
  include: [
    "docs/**/*",
    "**/*"
  ]
};
