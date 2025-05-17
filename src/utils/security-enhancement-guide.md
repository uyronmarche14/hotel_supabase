# Security Enhancement Guide for Hotel Booking System

This guide provides instructions for enhancing the security of your hotel booking system by implementing proper Row Level Security (RLS) policies in Supabase and fixing authentication issues.

## 1. Database Security Policies

The SQL script at `/src/utils/fix-db-policies.sql` contains updated Row Level Security (RLS) policies that should be applied to your Supabase database to ensure proper access control.

### How to Apply the Updated Policies:

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Go to the SQL Editor
4. Create a new query
5. Copy and paste the contents of `/src/utils/fix-db-policies.sql`
6. Run the query

These policies will ensure that:
- Only admin users can create, update, and delete rooms
- Users can only access their own data
- Admin users have access to all data
- Anonymous users can only read room data, not modify it

## 2. JWT Authentication Fixes

We've made several improvements to the JWT authentication system:

1. Consistent use of environment variables for JWT secret
2. Proper token verification in middleware
3. Enhanced token refresh mechanism

### Required Environment Variables:

Make sure your `.env` file contains the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=24h
```

## 3. Admin Authentication Workflow

The admin authentication workflow has been improved:

1. Admin users are properly identified by their role
2. Admin-specific routes are protected by the `isAdmin` middleware
3. JWT tokens include the user's role for authorization

## 4. Testing Your Security Enhancements

Run the verification test to ensure all security enhancements are working correctly:

```bash
node src/tests/verify-fixes.js
```

After applying the database policy changes in Supabase, you should see:
- Anonymous room insertion correctly denied by policy
- Anonymous user data access correctly denied by policy

## 5. Next Steps

1. Apply the database policy changes in Supabase
2. Run the verification test again to confirm the changes
3. Test the admin functionality with a real admin user
4. Proceed to the next stage of development

## Security Best Practices

1. Regularly rotate your JWT secret
2. Use HTTPS for all API requests
3. Implement rate limiting for authentication endpoints
4. Monitor failed login attempts
5. Regularly audit user permissions and roles
