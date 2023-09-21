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

export const mongoIdArraySchema = Type.Array(Type.Unknown());

export const basicPrivilegePropsSchema = Type.Object({
  users: Type.Optional(mongoIdArraySchema),
  groups: Type.Optional(mongoIdArraySchema),
  excludeUsers: Type.Optional(mongoIdArraySchema),
  excludeGroups: Type.Optional(mongoIdArraySchema),
});

export const allPrivilegePropsSchema = Type.Object({
  public: Type.Union([
    Type.Literal('true'),
    Type.Literal('false'),
    Type.Literal('onlyPublic'),
    Type.Literal('onlySignedIn'),
  ]),
  requireCsrfHeader: Type.Boolean(),
  ...basicPrivilegePropsSchema.schema,
});

export const formDataPrivilegesSchema = Type.Object({
  read: allPrivilegePropsSchema,
  create: allPrivilegePropsSchema,
  edit: allPrivilegePropsSchema,
  delete: allPrivilegePropsSchema,
});

export const formElemSchema = Type.Object({
  elemId: Type.String(),
  orderNr: Type.Number(),
  elemType: Type.String(),
  valueType: valueTypeSchema,
  classes: Type.Optional(Type.Array(Type.String())),
  elemData: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  label: Type.Optional(Type.Record(Type.String(), Type.String())),
  labelLangKey: Type.Optional(Type.String()),
  required: Type.Boolean(),
  validationRegExp: Type.Optional(Type.String()),
  mustMatchValue: Type.Optional(Type.String()),
  validationFn: Type.Optional(Type.String()),
  inputErrors: Type.Optional(
    Type.Array(
      Type.Object({
        errorId: Type.String(),
        message: Type.Optional(Type.Record(Type.String(), Type.String())),
        messageLangKey: Type.Optional(Type.String()),
      })
    )
  ),
  doNotSave: Type.Boolean(),
  privileges: formDataPrivilegesSchema,
});

export const formFormSchema = Type.Object({
  formTitle: Type.Optional(Type.Record(Type.String(), Type.String())),
  formTitleLangKey: Type.Optional(Type.String()),
  formText: Type.Optional(Type.Record(Type.String(), Type.String())),
  formTextLangKey: Type.Optional(Type.String()),
  classes: Type.Optional(Type.Array(Type.String())),
  lockOrder: Type.Optional(Type.Boolean()),
  formElems: Type.Array(formElemSchema),
});
export type FormForm = Static<typeof formFormSchema>;
