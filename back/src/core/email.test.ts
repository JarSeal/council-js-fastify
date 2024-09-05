import { describe, it, expect } from 'vitest';
import { replaceTemplateVars, validateTemplateVars } from './email';

describe('email', () => {
  it('validateTemplateVars', () => {
    const templateVarKeys1: string[] = [];
    const templateVars1 = {
      email: 'some@email.com',
      name: 'Terry Tester',
    };
    const result1 = validateTemplateVars(templateVarKeys1, templateVars1);
    expect(result1).toStrictEqual([]);

    const templateVarKeys2: string[] = ['email', 'name'];
    const templateVars2 = {
      email: 'some@email.com',
      name: 'Terry Tester',
    };
    const result2 = validateTemplateVars(templateVarKeys2, templateVars2);
    expect(result2).toStrictEqual([]);

    const templateVarKeys3: string[] = ['email', 'phone', 'name'];
    const templateVars3 = {
      email: 'some@email.com',
      name: 'Terry Tester',
    };
    const result3 = validateTemplateVars(templateVarKeys3, templateVars3);
    expect(result3).toStrictEqual(['phone']);

    const templateVarKeys4: string[] = ['email', 'phone', 'name'];
    const result4 = validateTemplateVars(templateVarKeys4);
    expect(result4).toStrictEqual(templateVarKeys4);
  });

  it('replaceTemplateVars', () => {
    const template1 = '<template>Hi {{name}}, your email is {{email}}</template>';
    const templateVars1 = {
      email: 'some@email.com',
      name: 'Terry Tester',
    };
    const result1 = replaceTemplateVars(template1, templateVars1);
    expect(result1).toBe('<template>Hi Terry Tester, your email is some@email.com</template>');

    const templateVars2 = {
      someOther: 'some@email.com',
      fullname: 'Terry Tester',
    };
    const result2 = replaceTemplateVars(template1, templateVars2);
    expect(result2).toBe(template1);

    const templateVars3 = {
      someOther: 'some@email.com',
      name: 'Terry Tester',
    };
    const result3 = replaceTemplateVars(template1, templateVars3);
    expect(result3).toBe('<template>Hi Terry Tester, your email is {{email}}</template>');

    const result4 = replaceTemplateVars(template1);
    expect(result4).toBe(template1);
  });
});
