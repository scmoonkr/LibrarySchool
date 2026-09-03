import app from './app.js';
import { env } from './config/env.js';
import { connectToDatabase } from './config/db.js';

async function bootstrap() {
  await connectToDatabase();

  app.listen(env.port, () => {
    console.log(`OneMinuteBible server listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
