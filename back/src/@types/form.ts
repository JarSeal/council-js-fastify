import { Type, type Static } from '@sinclair/typebox';

export const valueTypeSchema = Type.Union([
  Type.Literal('string'),
  Type.Literal('number'),
  Type.Literal('boolean'),
  Type.Literal('date'),
  Type.Literal('stringArray'),
  Type.Literal('numberArray'),
  Type.Literal('booleanArray'),
  Type.Literal('dateArray'),
  Type.Literal('objectArray'),
  Type.Literal('array'),
  Type.Literal('object'),
  Type.Literal('none'),
  Type.Literal('unknown'),
]);

export const mongoIdArraySchema = Type.Array(Type.String());

export const transTextSchema = Type.Optional(
  Type.Object({
    langs: Type.Optional(Type.Object(Type.Record(Type.String(), Type.String()))),
    langKey: Type.Optional(Type.String()),
  })
);
export type TransText = Static<typeof transTextSchema>;

export const basicPrivilegePropsSchema = Type.Object({
  users: Type.Optional(mongoIdArraySchema),
  groups: Type.Optional(mongoIdArraySchema),
  excludeUsers: Type.Optional(mongoIdArraySchema),
  excludeGroups: Type.Optional(mongoIdArraySchema),
});

export const allPrivilegePropsSchema = Type.Object({
  public: Type.Union([Type.Literal('true'), Type.Literal('false'), Type.Literal('onlyPublic')]),
  requireCsrfHeader: Type.Boolean(),
  ...basicPrivilegePropsSchema.schema,
});

export const formDataPrivilegesSchema = Type.Object({
  read: allPrivilegePropsSchema,
  create: allPrivilegePropsSchema,
  edit: allPrivilegePropsSchema,
  delete: allPrivilegePropsSchema,
});

export const formElemPublicSchema = Type.Object({
  elemId: Type.String(),
  orderNr: Type.Number(),
  elemType: Type.String(),
  valueType: valueTypeSchema,
  classes: Type.Optional(Type.Array(Type.String())),
  elemData: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  label: transTextSchema,
  required: Type.Boolean(),
  validationRegExp: Type.Optional(Type.String()),
  mustMatchValue: Type.Optional(Type.String()),
  validationFn: Type.Optional(Type.String()),
  inputErrors: Type.Optional(
    Type.Array(
      Type.Object({
        errorId: Type.String(),
        message: transTextSchema,
      })
    )
  ),
  doNotSave: Type.Boolean(),
});

export const formElemSchema = Type.Object({
  ...formElemPublicSchema.schema,
  privileges: formDataPrivilegesSchema,
});

export const formFormSchema = Type.Object({
  formTitle: transTextSchema,
  formText: transTextSchema,
  classes: Type.Optional(Type.Array(Type.String())),
  lockOrder: Type.Optional(Type.Boolean()),
  formElems: Type.Array(formElemSchema),
});
export type FormForm = Static<typeof formFormSchema>;
