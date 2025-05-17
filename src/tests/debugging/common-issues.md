# Debugging Common Issues in Hotel Booking System

This guide addresses common issues identified during testing of the admin functionality and provides solutions for debugging and fixing them.

## 1. CORS Configuration Issues

### Symptoms
- Frontend receives "Access to fetch at 'http://localhost:10000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy" errors
- API requests fail when made from the frontend but work in Postman or curl

### Debugging Steps
1. Check CORS configuration in `server.js`:
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

2. Verify that preflight requests are handled:
   ```javascript
   app.options('*', cors());
   ```

3. Test with browser developer tools:
   - Check Network tab for preflight OPTIONS requests
   - Verify response headers include:
     - `Access-Control-Allow-Origin: http://localhost:3000`
     - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type, Authorization`
     - `Access-Control-Allow-Credentials: true`

### Solutions
- Update CORS configuration to match frontend origin
- Ensure credentials mode is enabled if using cookies
- Add missing allowed headers if needed
- Set environment variable `CORS_ORIGIN` to match frontend URL

## 2. Authentication Token Handling

### Symptoms
- "Not authorized" errors despite being logged in
- Token is not recognized by the backend
- Admin routes return 403 errors for admin users

### Debugging Steps
1. Check token format in frontend requests:
   - Authorization header should be: `Bearer <token>`
   - No extra spaces or characters in the token

2. Verify token generation in `jwt.js`:
   ```javascript
   const generateToken = (userIdOrPayload, role) => {
     let payload;
     
     if (typeof userIdOrPayload === 'object') {
       payload = userIdOrPayload;
     } else {
       payload = { id: userIdOrPayload, role };
     }
     
     return jwt.sign(
       payload,
       JWT_SECRET,
       { expiresIn: JWT_EXPIRES_IN }
     );
   };
   ```

3. Test token verification with a known token:
   ```javascript
   const decoded = jwt.verify(token, JWT_SECRET);
   console.log('Decoded token:', decoded);
   ```

4. Check middleware for proper token extraction:
   ```javascript
   // In auth.middleware.js
   let token;
   
   if (
     req.headers.authorization && 
     req.headers.authorization.startsWith('Bearer')
   ) {
     token = req.headers.authorization.split(' ')[1];
   } else if (req.cookies.token) {
     token = req.cookies.token;
   }
   ```

### Solutions
- Ensure JWT_SECRET is consistent between token generation and verification
- Check token expiration time (default is 24h)
- Verify that admin role is correctly included in the token payload
- Implement token refresh mechanism for long sessions

## 3. Image Path Resolution

### Symptoms
- Images not displaying on frontend
- Broken image links
- Relative paths not resolving correctly

### Debugging Steps
1. Check how image URLs are stored in the database:
   ```sql
   SELECT image_url, images FROM rooms LIMIT 5;
   ```

2. Verify image URL transformation in room controller:
   ```javascript
   // Transform data for frontend compatibility
   const roomsResponse = rooms.map(room => ({
     id: room.id,
     title: room.title,
     // ...
     imageUrl: room.image_url,
     images: room.images || [],
     // ...
   }));
   ```

3. Test image URL resolution in browser:
   - Check Network tab for 404 errors on image requests
   - Verify that URLs are absolute or properly relative to frontend base URL

### Solutions
- Ensure image URLs are stored with proper paths
- Transform relative URLs to absolute URLs in API responses:
   ```javascript
   const getAbsoluteUrl = (relativeUrl) => {
     if (!relativeUrl) return null;
     if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
       return relativeUrl;
     }
     return `${process.env.API_URL || 'http://localhost:10000'}${relativeUrl}`;
   };
   
   // In controller
   imageUrl: getAbsoluteUrl(room.image_url),
   images: (room.images || []).map(getAbsoluteUrl),
   ```

- Update frontend components to handle both relative and absolute URLs

## 4. Error Response Formatting

### Symptoms
- Inconsistent error handling in frontend
- Missing error messages
- Unexpected error format

### Debugging Steps
1. Check error handler middleware:
   ```javascript
   // In errorHandler.js
   const errorHandler = (err, req, res, next) => {
     err.statusCode = err.statusCode || 500;
     err.status = err.status || 'error';
     
     // Development error response
     if (process.env.NODE_ENV === 'development') {
       res.status(err.statusCode).json({
         success: false,
         status: err.status,
         message: err.message,
         stack: err.stack,
         error: err
       });
     } 
     // Production error response
     else {
       // Operational, trusted error: send message to client
       if (err.isOperational) {
         res.status(err.statusCode).json({
           success: false,
           status: err.status,
           message: err.message
         });
       } 
       // Programming or other unknown error: don&apos;t leak error details
       else {
         console.error('ERROR 💥', err);
         
         res.status(500).json({
           success: false,
           status: 'error',
           message: 'Something went wrong'
         });
       }
     }
   };
   ```

2. Verify validation error handling:
   ```javascript
   // In controllers
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
     return res.status(400).json({
       success: false,
       message: 'Validation failed',
       errors: errors.array()
     });
   }
   ```

3. Test error responses with invalid requests:
   - Missing required fields
   - Invalid data types
   - Unauthorized access

### Solutions
- Ensure consistent error response format across all controllers:
  ```javascript
  {
    success: false,
    message: 'Error message',
    errors: [] // Optional validation errors array
  }
  ```

- Add custom AppError class for operational errors:
  ```javascript
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
      
      Error.captureStackTrace(this, this.constructor);
    }
  }
  ```

- Update frontend error handling to match backend error format

## 5. Database Connection Issues

### Symptoms
- 500 errors on database operations
- Timeout errors
- Inconsistent database responses

### Debugging Steps
1. Check Supabase connection configuration:
   ```javascript
   // In config/supabase.js
   const supabaseUrl = process.env.SUPABASE_URL;
   const supabaseKey = process.env.SUPABASE_ANON_KEY;
   
   if (!supabaseUrl || !supabaseKey) {
     console.error('Missing Supabase environment variables');
     process.exit(1);
   }
   
   const supabaseClient = createClient(supabaseUrl, supabaseKey, {
     auth: {
       persistSession: false
     }
   });
   ```

2. Test database connection:
   ```javascript
   const testConnection = async () => {
     try {
       const startTime = Date.now();
       const { data, error } = await supabaseClient
         .from('users')
         .select('count')
         .limit(1);
       
       const responseTime = Date.now() - startTime;
       
       if (error) {
         console.error('Database connection failed:', error.message);
         return false;
       }
       
       console.log(`Database connection successful (${responseTime}ms)`);
       return true;
     } catch (error) {
       console.error('Database connection test failed:', error.message);
       return false;
     }
   };
   ```

3. Check for database policy issues:
   - Verify that Row Level Security (RLS) policies are correctly configured
   - Test with admin token to bypass RLS

### Solutions
- Ensure environment variables are correctly set
- Implement connection pooling for better performance
- Add retry logic for transient database errors
- Update RLS policies to match application requirements

## 6. Admin Dashboard Data Issues

### Symptoms
- Missing or incorrect dashboard statistics
- NaN or undefined values in dashboard data
- Frontend charts not rendering properly

### Debugging Steps
1. Check dashboard data calculation in admin controller:
   ```javascript
   // In admin.controller.js
   exports.getDashboardStats = async (req, res, next) => {
     try {
       // Get total users
       const { count: totalUsers, error: userError } = await supabaseClient
         .from('users')
         .select('count');
       
       if (userError) {
         return next(new AppError(userError.message, 500));
       }
       
       // Get total rooms
       // ...
       
       // Calculate monthly revenue
       const monthlyRevenue = Array(12).fill(0);
       
       revenueData.forEach(booking => {
         const bookingDate = new Date(booking.created_at);
         if (bookingDate.getFullYear() === currentYear) {
           const month = bookingDate.getMonth();
           monthlyRevenue[month] += booking.total_price || 0;
         }
       });
       
       // ...
     } catch (error) {
       next(new AppError(error.message, 500));
     }
   };
   ```

2. Test dashboard endpoint with Postman or curl:
   ```bash
   curl -X GET http://localhost:10000/api/admin/dashboard \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json"
   ```

3. Verify data types and formats:
   - Ensure numeric values are properly parsed
   - Check date handling for monthly revenue calculation
   - Verify that arrays are properly initialized

### Solutions
- Add data validation and type checking
- Implement fallback values for missing data
- Format dates consistently
- Add error handling for individual dashboard components

## 7. Frontend-Backend Integration Issues

### Symptoms
- Frontend components not receiving expected data
- TypeScript type errors
- Inconsistent data formats

### Debugging Steps
1. Check API response formats:
   ```javascript
   // Example response format for rooms
   res.status(200).json({
     success: true,
     count: count,
     pagination: {
       currentPage: page,
       totalPages: totalPages,
       totalItems: count,
       itemsPerPage: limit
     },
     rooms: roomsResponse
   });
   ```

2. Verify frontend API service:
   ```typescript
   // Example frontend API service
   export const getRooms = async (page = 1, limit = 10): Promise<RoomResponse> => {
     try {
       const response = await axios.get<RoomResponse>(
         `${API_URL}/hotels?page=${page}&limit=${limit}`
       );
       return response.data;
     } catch (error: unknown) {
       if (axios.isAxiosError(error)) {
         throw new Error(error.response?.data.message || 'Failed to fetch rooms');
       }
       throw new Error('An unexpected error occurred');
     }
   };
   ```

3. Test with browser developer tools:
   - Check Network tab for request/response details
   - Verify that response format matches frontend expectations

### Solutions
- Ensure consistent API response formats
- Update frontend TypeScript interfaces to match backend responses
- Implement proper error handling in frontend API services
- Add data transformation layers if needed

## Running Tests

To run the test suite and identify these issues:

```bash
# Install test dependencies
npm install --save-dev mocha chai sinon supertest

# Run unit tests
npx mocha src/tests/unit/**/*.test.js

# Run integration tests
npx mocha src/tests/integration/**/*.test.js

# Run specific test file
npx mocha src/tests/unit/controllers/admin.controller.test.js
```

## Conclusion

By systematically addressing these common issues, you can ensure that the admin functionality works correctly and integrates seamlessly with the frontend. The test suite provides a comprehensive framework for identifying and fixing these issues before they affect production users.
