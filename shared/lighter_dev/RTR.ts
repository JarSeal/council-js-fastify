import type { TransText } from './LANG.js';

export type Route = {
  path: string;
  componentId: string;
  layoutWrapperId?: string;
  meta?: { title?: TransText; description?: TransText };
  isActive?: boolean;
  params?: { [key: string]: string };
};
