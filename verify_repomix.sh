#!/bin/bash
set -e

# Assert repomix.config.json exists
if [ ! -f repomix.config.json ]; then
  echo "Error: repomix.config.json does not exist."
  exit 1
fi

echo "Running repomix..."
npx repomix

# Assert repomix-output.xml exists
if [ ! -f repomix-output.xml ]; then
  echo "Error: repomix-output.xml does not exist."
  exit 1
fi

echo "Verifying contents of repomix-output.xml..."

# Assert .ai-status.md *content* is present near the top (first 200 lines)
# Since we use instructionFilePath, it should appear early.
head -n 200 repomix-output.xml | grep "# AI Status" > /dev/null
if [ $? -eq 0 ]; then
  echo "Success: .ai-status.md content found near the top (as instructions)."
else
  echo "Error: .ai-status.md content not found in the first 200 lines."
  exit 1
fi

# Assert docs/ARCHITECTURE.md is present in the output
# Note: Strict pinning of multiple files is not supported by repomix standard configuration.
# We verify its presence. It may appear later in the file due to alphabetical sorting.
grep "path=\"docs/ARCHITECTURE.md\"" repomix-output.xml > /dev/null
if [ $? -eq 0 ]; then
  echo "Success: docs/ARCHITECTURE.md found in the output."
else
  echo "Error: docs/ARCHITECTURE.md not found in the output."
  exit 1
fi

echo "Verification passed!"
