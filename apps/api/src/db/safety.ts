const safeDatabaseSuffixes = ["_development", "_test"] as const;

export const assertDisposableDatabase = (databaseName: string): void => {
  if (!safeDatabaseSuffixes.some((suffix) => databaseName.endsWith(suffix))) {
    throw new Error(
      `Refusing a destructive database operation on ${databaseName}. The name must end with _development or _test.`,
    );
  }
};
