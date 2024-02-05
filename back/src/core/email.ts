import nodemailer, { type Transporter } from 'nodemailer';

import { decryptData, getSysSetting } from './config';

let transporter: Transporter;
const createTransport = async () => {
  const encryptedPass = (await getSysSetting<string>('emailPass')) || '';
  const pass = decryptData(encryptedPass);
  transporter = nodemailer.createTransport({
    host: (await getSysSetting<string>('emailHost')) || '',
    auth: {
      user: (await getSysSetting<string>('emailUser')) || '',
      pass,
    },
    port: (await getSysSetting<number>('emailPort')) || 587,
  });
};

type SendEmailParams = {
  templateId: string;
  to: string;
  emailVars: { [key: string]: string | number | string[] | number[] };
};

export const sendEmail = async ({ templateId, to, emailVars }: SendEmailParams) => {
  const emailEnabled = (await getSysSetting<boolean>('useEmail')) || false;
  if (!emailEnabled) return;

  if (!transporter) await createTransport();

  // @WIP
  templateId;
  to;
  emailVars;
};
