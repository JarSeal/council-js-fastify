import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter;
const createTransport = () => {
  transporter = nodemailer.createTransport({
    host: '', // @TODO: add setting
    auth: {
      user: '', // @TODO: add setting
      pass: '', // @TODO: add setting
    },
    port: 587, // @TODO: add setting
  });
};

type SendEmailParams = {
  templateId: string;
  to: string;
  emailVars: { [key: string]: string | number | string[] | number[] };
};

export const sendEmail = ({ templateId, to, emailVars }: SendEmailParams) => {
  if (!transporter) createTransport();

  // @WIP
  templateId;
  to;
  emailVars;
};
