import { Inject, Injectable } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { users } from 'src/database/schema';
import type { User } from 'src/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }
}
