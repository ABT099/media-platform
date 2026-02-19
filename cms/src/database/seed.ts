import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo';

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db
    .insert(schema.users)
    .values({
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Demo User',
    })
    .onConflictDoNothing({ target: schema.users.email });

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, DEMO_EMAIL))
    .limit(1);

  await pool.end();

  if (user) {
    console.log(`Demo account ready: ${user.email} / ${DEMO_PASSWORD}`);
  } else {
    console.log('Demo account already existed or was created.');
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
