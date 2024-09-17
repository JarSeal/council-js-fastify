import type { TransText } from './LNG.js';

export type Route = {
  path: string;
  componentId: string;
  layoutWrapperId?: string;
  meta?: { title?: TransText; description?: TransText };
  isActive?: boolean;
  params?: { [key: string]: string };
};
