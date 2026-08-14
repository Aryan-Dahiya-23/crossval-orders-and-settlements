export const runDatabaseCommand = async (
  label: string,
  command: () => Promise<void>,
): Promise<void> => {
  try {
    await command();
  } catch {
    console.error(
      `${label} failed. Check the environment configuration, MongoDB connectivity, and database permissions.`,
    );
    process.exitCode = 1;
  }
};
