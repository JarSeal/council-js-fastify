import nodemailer, { type Transporter } from 'nodemailer';

import { getSysSetting } from './config';

let transporter: Transporter;
const createTransport = async () => {
  transporter = nodemailer.createTransport({
    host: (await getSysSetting<string>('emailHost')) || '',
    auth: {
      user: (await getSysSetting<string>('emailUser')) || '',
      pass: (await getSysSetting<string>('emailPass')) || '', // @TODO: add decryption
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
  if (!transporter) await createTransport();

  // @WIP
  templateId;
  to;
  emailVars;
};
