import { replaceTemplateVars } from './email';

describe('email', () => {
  it('replaceTemplateVars', () => {
    // @TODO
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
