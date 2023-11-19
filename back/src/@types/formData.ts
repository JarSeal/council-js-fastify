import { Type, type Static } from '@sinclair/typebox';

import { valueTypeSchema } from './form';

export const formDataSchema = Type.Object({
  dataId: Type.String(),
  elemId: Type.String(),
  orderNr: Type.Number(),
  value: Type.Unknown(),
  valueType: valueTypeSchema,
});
export type FormData = Static<typeof formDataSchema>;

export const errorResponseSchema = Type.Object({
  statusCode: Type.Number(),
  code: Type.String(),
  error: Type.String(),
  message: Type.String(),
});
export type ErrorResponseSchema = Static<typeof errorResponseSchema>;
