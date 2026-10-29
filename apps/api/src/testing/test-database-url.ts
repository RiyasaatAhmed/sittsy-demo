/** Integration tests truncate tables: require an explicitly test-named database. */
export function assertTestDatabaseUrl(url: string): void {
  const name = new URL(url).pathname.slice(1);
  if (!/^[a-zA-Z0-9_]+_test$/.test(name)) {
    throw new Error("TEST_DATABASE_URL must name a dedicated database ending in _test; refusing destructive test setup.");
  }
}
