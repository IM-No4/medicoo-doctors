export const ROUTES = {
  AUTH: {
    name: 'Auth',
    requiresAuth: false,
  },

  MAIN: {
    name: 'Main',
    requiresAuth: true,
  },
} as const;
