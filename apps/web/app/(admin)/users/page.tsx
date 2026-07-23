import { db } from '@asset-pulse/db';
import { users, properties, userScopes } from '@asset-pulse/db/schema';
import { eq } from 'drizzle-orm';
import UsersView from './UsersView';

export const revalidate = 0; // Disable caching so list stays fresh

export default async function UsersPage() {
  // Query properties directly from DB
  const rawProperties = await db.select().from(properties);

  // Query users directly from DB
  const rawUsers = await db.select().from(users);

  // Fetch assigned property scopes for users
  const rawScopes = await db
    .select({
      id: userScopes.id,
      userId: userScopes.userId,
      propertyId: userScopes.propertyId,
      propertyName: properties.name,
    })
    .from(userScopes)
    .leftJoin(properties, eq(userScopes.propertyId, properties.id));

  // Map users with their assigned property scopes
  const formattedUsers = rawUsers.map((user) => {
    const userScopes = rawScopes.filter((s) => s.userId === user.id);
    return {
      ...user,
      scopes: userScopes,
    };
  });

  return (
    <UsersView
      initialUsers={formattedUsers}
      initialProperties={rawProperties}
    />
  );
}