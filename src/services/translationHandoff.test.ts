import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("translation handoff configuration", () => {
  it("does not enable mock translations by default", () => {
    const envExample = readProjectFile(".env.example");
    const windowsStart = readProjectFile("start-windows.ps1");
    const windowsDev = readProjectFile("dev-windows.ps1");

    expect(envExample).not.toMatch(/^TRANSLATION_PROVIDER=mock$/m);
    expect(windowsStart).not.toContain("TRANSLATION_PROVIDER=mock");
    expect(windowsDev).not.toContain("TRANSLATION_PROVIDER=mock");
  });
});

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}
