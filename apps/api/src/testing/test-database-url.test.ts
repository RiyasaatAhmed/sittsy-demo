import { expect, it } from "vitest";
import { assertTestDatabaseUrl } from "./test-database-url";

it("permits only explicitly test-named databases", () => {
  expect(() => assertTestDatabaseUrl("postgres://localhost/sitters_test")).not.toThrow();
  for (const name of ["sitters", "postgres", "test", "sitters_test_prod", "sitters%5Ftest"]) {
    expect(() => assertTestDatabaseUrl(`postgres://localhost/${name}`)).toThrow(/dedicated/);
  }
});
