export const API_ROUTES = {
  ADMIN: {
    USERS: '/api/admin/users',
  },
  PROPERTIES: '/api/properties',
} as const;

export const LOCAL_HOST = 'http://localhost:3000';

export const HOST_URL = process.env.NEXT_PUBLIC_APP_URL || LOCAL_HOST;