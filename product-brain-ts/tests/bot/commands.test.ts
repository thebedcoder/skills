import { describe, expect, it } from "vitest";
import { parseBrainCommand } from "../../src/bot/commands.js";

describe("parseBrainCommand", () => {
  it("returns null for empty body", () => {
    expect(parseBrainCommand("")).toBeNull();
  });

  it("returns null when no /brain present", () => {
    expect(parseBrainCommand("hello there")).toBeNull();
  });

  it("defaults to groom when /brain alone", () => {
    expect(parseBrainCommand("/brain")).toEqual({ command: "groom", args: "" });
  });

  it("parses each known command", () => {
    for (const cmd of ["groom", "estimate", "edges", "related", "draft-tickets", "refresh", "explain", "on", "off"]) {
      expect(parseBrainCommand(`/brain ${cmd}`)).toEqual({ command: cmd, args: "" });
    }
  });

  it("returns null for unknown subcommand", () => {
    expect(parseBrainCommand("/brain whatever")).toBeNull();
  });

  it("captures trailing args", () => {
    expect(parseBrainCommand("/brain groom AHA-1234 --deep")).toEqual({
      command: "groom",
      args: "AHA-1234 --deep",
    });
  });

  it("works embedded in a longer comment body (matches Python parser behavior)", () => {
    const body = "Hi team, please run\n/brain edges\nwhen you have a moment.";
    expect(parseBrainCommand(body)?.command).toBe("edges");
  });

  it("works as a single-line comment", () => {
    expect(parseBrainCommand("/brain edges")?.command).toBe("edges");
  });

  it("ignores /brain not at line start", () => {
    expect(parseBrainCommand("not at start /brain groom")).toBeNull();
  });

  it("lowercases the command", () => {
    expect(parseBrainCommand("/brain GROOM")).toEqual({ command: "groom", args: "" });
  });
});
