import nodemailer, { type Transporter } from 'nodemailer';

import { decryptData, getSysSetting } from './config';
import { logger } from './app';
import DBEmailModel, { type DBEmail } from '../dbModels/email';

let transporter: Transporter;
const createTransport = async () => {
  const host = (await getSysSetting<string>('emailHost')) || '';
  const user = (await getSysSetting<string>('emailUser')) || '';
  const encryptedPass = await getSysSetting<string>('emailPass');
  const pass = encryptedPass ? decryptData(encryptedPass) : '';
  const port = (await getSysSetting<number>('emailPort')) || 587;
  transporter = nodemailer.createTransport({
    host,
    auth: {
      user,
      pass,
    },
    port,
  });

  logger.info(
    `Email transporter created. Status: [host: ${host ? 'ok' : 'empty'}, user: ${
      user ? 'ok' : 'empty'
    }, pass: ${pass ? 'ok' : 'empty'}, port: ${port}].`
  );
};

type TemplateVars = { [key: string]: string | number | string[] | number[] };

type SendEmailParams = {
  to: string;
  templateId: string;
  templateVars?: TemplateVars;
};

// @TODO: add tests
export const sendEmail = async ({ to, templateId, templateVars }: SendEmailParams) => {
  const emailEnabled = (await getSysSetting<boolean>('useEmail')) || false;
  if (!emailEnabled) return;

  if (!to) {
    logger.error("Email sending failed, 'to' param was empty.");
    return;
  }

  // Create transporter if it doesn't exist
  if (!transporter) await createTransport();

  // Get template from DB
  const template = await DBEmailModel.findOne<DBEmail>({ simpleId: templateId });
  if (!template) {
    logger.error(`Email sending failed, template not found (id: '${templateId}').`);
    return;
  }

  // Validate templateVars and subjectVars
  const templateVarsValidationError = validateTemplateVars(template.templateVarKeys, templateVars);
  if (templateVarsValidationError.length) {
    logger.error(
      `Email sending failed, missing templateVars params (${templateVarsValidationError.join(
        ', '
      )}).`
    );
    return;
  }

  const readySubject = replaceTemplateVars(template.subject, templateVars);
  const readyTemplate = replaceTemplateVars(template.template, templateVars);

  // @WIP
  readySubject;
  readyTemplate;
};

export const validateTemplateVars = (templateVarKeys: string[], templateVars?: TemplateVars) => {
  const missingVars = [];
  if (!templateVars && templateVarKeys.length) {
    return templateVarKeys;
  }
  for (let i = 0; i < templateVarKeys.length; i++) {
    if (templateVars && !templateVars[templateVarKeys[i]]) missingVars.push(templateVarKeys[i]);
  }
  return missingVars;
};

export const replaceTemplateVars = (template: string, templateVars?: TemplateVars) => {
  if (!templateVars) return template;
  const templateVarKeys = Object.keys(templateVars);
  let replaced = template;
  for (let i = 0; i < templateVarKeys.length; i++) {
    const v = templateVarKeys[i];
    const regex = new RegExp(`{{${v}}}`, 'g');
    const replaceWith = templateVars[v];
    if (Array.isArray(replaceWith)) {
      replaced = replaced.replace(regex, replaceWith.join(', '));
    } else {
      replaced = replaced.replace(regex, String(replaceWith));
    }
  }
  return replaced;
};
