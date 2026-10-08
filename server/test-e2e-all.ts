import { execSync } from "child_process";

console.log("======================================================================");
console.log("     MESOB RESTAURANT MANAGEMENT SYSTEM - FULL E2E ACCEPTANCE SUITE    ");
console.log("======================================================================\n");

const suites = [
  { name: "Stage 1 Acceptance (PRD 25.4.1)", file: "test-stage1-acceptance.ts" },
  { name: "Stage 2 Acceptance (PRD 25.4.2)", file: "test-stage2-acceptance.ts" },
  { name: "Stage 3 Acceptance (PRD 25.4.3)", file: "test-stage3-acceptance.ts" },
];

let allPassed = true;

for (const suite of suites) {
  console.log(`\n>>> RUNNING: ${suite.name} ...`);
  try {
    const output = execSync(`npx tsx ${suite.file}`, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "test" },
    });
    console.log(`>>> SUCCESS: ${suite.name} passed completely!\n`);
  } catch (err: any) {
    console.error(`>>> FAILURE: ${suite.name} encountered an error.`);
    allPassed = false;
    process.exit(1);
  }
}

if (allPassed) {
  console.log("======================================================================");
  console.log("  ALL ACCEPTANCE CRITERIA VERIFIED (STAGE 1, 2, and 3 COMPLETE)       ");
  console.log("======================================================================");
}
