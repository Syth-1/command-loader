import { mkdir, cp } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { rename } from "fs/promises";

// Prompt user for folder name
const prompt = async (question: string) => {
  process.stdout.write(question);

  for await (let line of console) {
    line = line.trim();

    if (line === "") {
      console.log("invalid input, please try again.\n");
      process.stdout.write(question);
      continue;
    }

    return line;
  }
};

const main = async () => {
  const input = await prompt("Enter test name: ");
  if (!input) {
    console.log("No name provided. Exiting.");
    process.exit(1);
  }

  const folderName = `${input}-test`;
  const testDir = join("tests", folderName);

  if (existsSync(testDir)) {
    console.log(`Folder "${testDir}" already exists. Exiting.`);
    process.exit(1);
  }

  // Ensure tests/ exists
  if (!existsSync("tests")) {
    await mkdir("tests");
  }

  // Copy template folder
  const templateDir = "tests/_template_";
  if (!existsSync(templateDir)) {
    console.log(`Template folder "${templateDir}" does not exist. Exiting.`);
    process.exit(1);
  }

  await cp(templateDir, testDir, { recursive: true });

  // Rename app.ts to {test name}.test.ts
  const oldTestFile = join(testDir, "app.ts");
  const newTestFile = join(testDir, `${input}.test.ts`);
  if (existsSync(oldTestFile)) {
    await rename(oldTestFile, newTestFile);
    console.log(
      `Renamed app.ts to ${input}.test.ts in ${testDir}`
    );
  } else {
    console.log(
      `Warning: app.ts not found in template, so no file was renamed.`
    );
  }

  console.log(`Test folder created at ${testDir} with template contents.`);
  process.exit(0);
};

main();