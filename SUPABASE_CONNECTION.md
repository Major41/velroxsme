# Supabase Database Connection Guide

This guide explains how to connect to and use the Supabase database in this project.

## Prerequisites

- Node.js 16+ installed
- Supabase account and project created
- Environment variables properly configured

## Environment Variables

All required environment variables are automatically set in your Vercel project. Here's what's configured:

### Public Variables (safe to expose in frontend)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Private Variables (server-only, never expose)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_ANON_KEY=your_anon_key
```

### Database Connection (for direct PostgreSQL access)
```
POSTGRES_URL=postgresql://user:password@host:port/database
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:port/database
POSTGRES_PRISMA_URL=postgresql://user:password@host:port/database
POSTGRES_HOST=host
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=postgres
```

## Project Structure

The Supabase integration is organized as follows:

```
lib/
  supabase/
    client.ts      # Browser client for client-side queries
    server.ts      # Server client for server-side queries
    proxy.ts       # Proxy for middleware session handling

app/
  auth/
    callback/
      route.ts     # OAuth callback handler
    login/
      page.tsx     # Login page with Supabase auth
    signup/
      page.tsx     # Signup page with Supabase auth

middleware.ts      # Session refresh and protection
```

## Using the Supabase Client

### Client-Side (Browser)
Use this in Client Components (`'use client'`):

```typescript
import { createClient } from '@/lib/supabase/client';

export default function MyComponent() {
  const supabase = createClient();

  const handleFetch = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);

    if (error) console.error('Error:', error);
    return data;
  };

  return <button onClick={handleFetch}>Fetch Data</button>;
}
```

### Server-Side (Server Components/Route Handlers)
Use this in Server Components or API routes:

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) return Response.json({ error }, { status: 400 });
  return Response.json(data);
}
```

## Database Tables

### Current Tables

#### `super_admin_profiles`
Stores super admin user information with Row Level Security.

**Columns:**
- `id` (UUID) - User ID from auth.users, Primary Key
- `name` (TEXT) - Admin's full name
- `role` (TEXT) - Always 'super-admin'
- `created_at` (TIMESTAMP) - Account creation date
- `is_active` (BOOLEAN) - Whether account is active

**RLS Policies:**
- Super admins can view their own profile
- Super admins can update their own profile

## Authentication Flow

### Sign Up
1. User provides name, email, and password
2. Supabase creates auth user with metadata
3. Trigger auto-creates profile in `super_admin_profiles`
4. User data stored in React Context
5. Redirect to dashboard

### Login
1. User provides email and password
2. Supabase authenticates credentials
3. User data fetched and stored in Context
4. Session maintained via HTTP-only cookies
5. Redirect to dashboard

### Logout
1. Call `supabase.auth.signOut()`
2. User cleared from React Context
3. Session cookies cleared
4. Redirect to login page

## Common Operations

### Fetch User Profile
```typescript
const { data } = await supabase
  .from('super_admin_profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### Update User Profile
```typescript
const { error } = await supabase
  .from('super_admin_profiles')
  .update({ name: 'New Name' })
  .eq('id', userId);
```

### Check Authentication
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  // console.log('User is logged in:', user.email);
}
```

### Sign Out
```typescript
await supabase.auth.signOut();
```

## User Context

The app uses a React Context for user state management:

```typescript
import { useUser } from '@/context/UserContext';

export default function MyComponent() {
  const { user, setUser, logout } = useUser();

  if (!user) return <p>Not logged in</p>;

  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Protected Routes

The dashboard and admin routes are protected via the UserContext:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

export default function ProtectedPage() {
  const router = useRouter();
  const { user } = useUser();

  if (!user) {
    router.push('/super-admin/login');
    return null;
  }

  return <div>Protected content</div>;
}
```

## Middleware

The `middleware.ts` file handles:
- Token refresh on every request
- Session validation
- Protected route enforcement

No manual configuration needed—it works automatically.

## Row Level Security (RLS)

All tables have RLS enabled to protect data:

- **SELECT**: Users can only read their own data
- **INSERT**: Users can only insert data for themselves
- **UPDATE**: Users can only modify their own data
- **DELETE**: Users can only delete their own data

To add new tables with RLS, use the Supabase UI or execute SQL via the MCP.

## Troubleshooting

### "No session found"
- User not authenticated
- Session expired
- Check if user is in UserContext

### "Permission denied" (RLS error)
- RLS policy doesn't allow the operation
- User doesn't own the data
- Check RLS policies on the table

### "POSTGRES_URL not set"
- Environment variables not loaded
- Restart dev server
- Verify `.env.local` has credentials

### "Auth error: Invalid credentials"
- Wrong email/password
- User not confirmed (check email)
- Try resetting password

## Next Steps

1. **Add new tables** via Supabase dashboard or SQL migrations
2. **Implement RLS policies** for data protection
3. **Create API routes** for complex queries
4. **Add email verification** for signup
5. **Set up password reset** flow

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/sql-createrole.html)
- [Next.js Supabase Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

## Support

For issues or questions about Supabase integration, refer to the [Supabase documentation](https://supabase.com/docs) or contact the Supabase support team.
