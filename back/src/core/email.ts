import nodemailer, { type Transporter } from 'nodemailer';
import { marked } from 'marked';

import { IS_TEST, decryptData, getSysSetting } from './config';
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

export const sendEmail = async ({ to, templateId, templateVars }: SendEmailParams) => {
  const emailEnabled = (await getSysSetting<boolean>('useEmail')) || false;
  if (!emailEnabled || IS_TEST) return;

  if (!to) {
    logger.error("Email sending failed, 'to' param was empty.");
    return;
  }

  // Create transporter if it doesn't exist
  if (!transporter) await createTransport();

  // Get template and templateWrapper from DB
  const template = await DBEmailModel.findOne<DBEmail>({ simpleId: templateId });
  if (!template) {
    logger.error(`Email sending failed, template not found (id: '${templateId}').`);
    return;
  }
  let templateWrapper: DBEmail | null = null;
  if (template.wrapperTemplateId) {
    templateWrapper = await DBEmailModel.findOne<DBEmail>({
      simpleId: template.wrapperTemplateId,
      isHtmlTemplateWrapper: true,
    });
    if (!templateWrapper) {
      logger.error(
        `Email sending failed, wrapper template not found (id: '${template.wrapperTemplateId}').`
      );
      return;
    }
  }

  // Validate templateVars and subjectVars
  const templateVarsValidationError = validateTemplateVars(template.templateVarKeys, templateVars);
  if (templateVarsValidationError.length) {
    logger.error(
      `Email sending failed, missing templateVars params for template (${templateVarsValidationError.join(
        ', '
      )}).`
    );
    return;
  }
  if (templateWrapper) {
    const wrapperVarsValidationError = validateTemplateVars(templateWrapper?.templateVarKeys, {
      ...templateVars,
      wrapperContent: 'empty', // Add wrapperContent temporarily here to pass validation
    });
    if (wrapperVarsValidationError.length) {
      logger.error(
        `Email sending failed, missing templateVars params for wrapper (${wrapperVarsValidationError.join(
          ', '
        )}).`
      );
      return;
    }
  }

  const readySubject = replaceTemplateVars(template.subject, templateVars);
  const readyTemplateText = replaceTemplateVars(template.template, templateVars);
  let readyTemplate = await marked.parse(readyTemplateText);
  if (templateWrapper) {
    const wrapper = replaceTemplateVars(templateWrapper.template, templateVars);
    readyTemplate = replaceTemplateVars(wrapper, { wrapperContent: readyTemplate });
  }

  const emailUser = (await getSysSetting<string>('emailUser')) || '';

  const mailOptions = {
    from: emailUser,
    to,
    subject: readySubject,
    text: readyTemplateText,
    html: readyTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email with template "${templateId}" sent.`);
  } catch (err) {
    logger.error(
      `Error while trying to send email (templateId: ${templateId}), err: ${JSON.stringify(err)}`
    );
  }
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
