export type Environment = 'development' | 'production' | 'test';
export const ENVIRONMENT = 'development'; // @TODO: Get this from env variables or default to something (maybe production)

export const HOST = '127.0.0.1'; // @TODO: Get this from env variables or default to something (maybe localhost)
export const PORT = 4000; // @TODO: Get this from env variables or default to something (maybe 4000)

// comma separated host names
export const CLIENT_HOST_NAMES = 'localhost'; // @TODO: Get this from env variables or default to something (maybe localhost)
