import { describe, expect, it } from "vitest";
import { parseAssignees } from "@/lib/normalization/assignees";

describe("parseAssignees", () => {
  it("maps current team members", () => {
    expect(parseAssignees("Antonio").members).toEqual(["antonio"]);
    expect(parseAssignees("Christopher").members).toEqual(["christopher"]);
    expect(parseAssignees("Luiza").members).toEqual(["luiza"]);
    expect(parseAssignees("Vitória").members).toEqual(["vitoria"]);
  });
  it("splits combinations into multiple assignees", () => {
    expect(parseAssignees("Christopher/Antonio").members).toEqual(["christopher", "antonio"]);
    expect(parseAssignees("Luiza / Christopher").members).toEqual(["luiza", "christopher"]);
    expect(parseAssignees("Hugo e Christopher").members).toEqual(["hugo", "christopher"]);
    expect(parseAssignees("Christopher e Antonio").members).toEqual(["christopher", "antonio"]);
  });
  it("keeps archived members and never assigns current members arbitrarily", () => {
    expect(parseAssignees("Hugo").members).toEqual(["hugo"]);
    expect(parseAssignees("Bernardo").members).toEqual(["bernardo"]);
    expect(parseAssignees("Mollica/Christopher").members).toEqual(["mollica", "christopher"]);
    const todos = parseAssignees("Todos");
    expect(todos.members).toEqual([]);
    expect(todos.unmapped).toEqual(["todos"]);
    const jgp = parseAssignees("JGP FA");
    expect(jgp.members).toEqual([]);
    expect(jgp.unmapped.length).toBeGreaterThan(0);
  });
  it("handles empty", () => {
    expect(parseAssignees(null)).toEqual({ members: [], unmapped: [], confidence: 1 });
  });
});
