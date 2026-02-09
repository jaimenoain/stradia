import { strict as assert } from 'assert';

console.log("Starting QA for 'generate-action'...");

// Replicate the logic from the Edge Function
function parseResponse(text: string): any {
    let jsonStr = text;

    // Improved Logic
    // Allow optional 'json' tag, and optional whitespace/newlines inside the block boundaries.
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
        jsonStr = jsonMatch[1];
    }

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`Failed to parse JSON: ${(e as Error).message}`);
    }
}

// Test Cases
const testCases = [
    {
        name: "Clean JSON",
        input: '{"key": "value"}',
        expected: { key: "value" },
        shouldPass: true
    },
    {
        name: "Markdown with Newlines (Standard)",
        input: '```json\n{\n  "key": "value"\n}\n```',
        expected: { key: "value" },
        shouldPass: true
    },
    {
        name: "Markdown without Newlines (Edge Case 1)",
        input: '```json{"key": "value"}```',
        expected: { key: "value" },
        shouldPass: true
    },
    {
        name: "Markdown with extra text around",
        input: 'Here is the JSON:\n```json\n{"key": "value"}\n```\nHope it helps!',
        expected: { key: "value" },
        shouldPass: true
    },
    {
        name: "Markdown without 'json' tag",
        input: '```\n{"key": "value"}\n```',
        expected: { key: "value" },
        shouldPass: true
    }
];

let failedTests = 0;
let passedTests = 0;

for (const test of testCases) {
    try {
        const result = parseResponse(test.input);
        assert.deepEqual(result, test.expected);
        console.log(`✅ [PASS] ${test.name}`);
        passedTests++;
    } catch (e) {
        console.error(`❌ [FAIL] ${test.name}: ${(e as Error).message}`);
        failedTests++;
    }
}

console.log(`\nSummary: ${passedTests} passed, ${failedTests} failed.`);

if (failedTests > 0) {
    process.exit(1);
}
