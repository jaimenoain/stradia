export function validateDatabaseEnv() {

  const requiredVariables = ['DATABASE_URL', 'DIRECT_URL'];
  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    const message = `❌ Missing required environment variables: ${missingVariables.join(
      ', '
    )}. Please ensure these are set in your .env file or environment configuration.`;
    console.error(message);
    throw new Error(message);
  }

  // Check for default local values if not running in development
  if (process.env.NODE_ENV !== 'development') {
    const isLocalDbUrl = process.env.DATABASE_URL?.includes('localhost:5432') || process.env.DATABASE_URL?.includes('127.0.0.1:5432');
    const isLocalDirectUrl = process.env.DIRECT_URL?.includes('localhost:5432') || process.env.DIRECT_URL?.includes('127.0.0.1:5432');

    if (isLocalDbUrl || isLocalDirectUrl) {
      const message = `❌ Invalid environment variables: Detected local database URLs (localhost:5432) in a non-development environment (${process.env.NODE_ENV}). You must provide valid remote database URLs for production or test environments.`;
      console.error(message);
      throw new Error(message);
    }
  }
}
