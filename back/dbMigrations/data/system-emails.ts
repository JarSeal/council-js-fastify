import { type DBEmail } from '../../src/dbModels/email';

const getEmails = (): Partial<DBEmail>[] => {
  return [
    // Main wrapper [START]
    {
      simpleId: 'mainSysEmailWrapper',
      name: { langKey: 'Main system email wrapper' },
      description: { langKey: 'Wrapper for all system emails.' },
      systemDocument: true,
      isHtmlTemplateWrapper: true,
      templateVarKeys: ['wrapperContent', 'appName'],
      subject: '',
      template: `
<div style="margin:0;padding:0;" bgcolor="#f7f7f7">
  <style type="text/css">
      p, ol, ul, li, a, b, strong {
          font-size: 16px !important;
      }
  </style>
  <table width="100%" height="100%" style="min-width:320px" border="0" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7" role="presentation">
      <tbody>
          <tr align="center">
              <td>
                  <table width="100%" style="max-width:600px" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7" role="presentation">
                      <tbody>
                          <tr>
                              <td style="padding-top:20px;padding-bottom:20px;padding-left:30px;padding-right:30px;">
                                  <table width="100%" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7" role="presentation">
                                      <tbody>
                                          <tr>
                                              <td style="font-family:"Segoe UI",Helvetica,Arial,sans-serif!important;">
                                                  <h3 style="margin:10px 0;">{{appName}}</h3>
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </td>
                          </tr>
                          <tr>
                              <td>
                                  <table width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" role="presentation" style="box-sizing:border-box;border-spacing:0;width:100%!important;border-radius:10px!important;border:1px solid #f0f0f0;">
                                      <tbody>
                                          <tr style="box-sizing:border-box;">
                                              <td style="font-size:16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif!important;padding-top:10px;padding-bottom:15px;padding-left:30px;padding-right:30px;box-sizing:border-box;">
                                                  {{wrapperContent}}
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </td>
                          </tr>
                          <tr>
                              <td style="padding-top:20px;padding-bottom:20px;padding-left:30px;padding-right:30px;">
                                  <table width="100%" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7" role="presentation">
                                      <tbody>
                                          <tr>
                                              <td align="center" style="font-family:"Segoe UI",Helvetica,Arial,sans-serif!important;">
                                                  <b style="font-size:12px;">{{appName}}</b>
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </td>
                          </tr>
                      </tbody>
                  </table>
              </td>
          </tr>
      </tbody>
  </table>
</div>
      `,
    },
    // Main wrapper [/END]

    // Welcome email [START]
    {
      simpleId: 'welcomeEmail',
      name: { langKey: 'Welcome email' },
      description: { langKey: 'Welcome email template for newly registered users.' },
      systemDocument: true,
      wrapperTemplateId: 'mainSysEmailWrapper',
      templateVarKeys: ['username', 'sysLoginUrl', 'newPassRequestUrl'],
      subject: 'Welcome to {{appName}}',
      template: `
Welcome
-------

Your new account has been registered:
- Username: {{username}}

You can either [login]({{sysLoginUrl}}) or if you don't have a password,  
you can [create a new password]({{newPassRequestUrl}}) for you.

Login URL: {{sysLoginUrl}}

Create a new password URL: {{newPassRequestUrl}}

Do not reply to this email, thank you.
      `,
    },
    // Welcome email [/END]

    // Verify email [START]
    {
      simpleId: 'verifyEmail',
      name: { langKey: 'Verify email' },
      description: {
        langKey: "Verify user's primary email template that has the tokenized verification URL.",
      },
      systemDocument: true,
      wrapperTemplateId: 'mainSysEmailWrapper',
      templateVarKeys: ['username', 'verifyEmailUrl'],
      subject: 'Verify account email',
      template: `
Almost there, {{username}}, please verify your E-mail
-----------------------------------------------------

Please verify your account's E-mail by clicking this link:
[VERIFY]({{verifyEmailUrl}})

..or copy and paste this URL to your browser:
{{verifyEmailUrl}}

Do not reply to this email, thank you.
      `,
    },
    // Verify email [/END]

    // New pass link email [START]
    {
      simpleId: 'newPassLinkEmail',
      name: { langKey: 'New password link email' },
      description: {
        langKey: 'New password link email template that has the tokenized new password URL.',
      },
      systemDocument: true,
      wrapperTemplateId: 'mainSysEmailWrapper',
      templateVarKeys: ['username', 'newPassUrl', 'linkLifeInMinutes'],
      subject: 'Reset password link',
      template: `
Your Reset Password Link is Ready, {{username}}
-----------------------------------------------

You requested a link to reset your password. Here you go:
[Reset my password]({{newPassUrl}})

..or copy and paste this URL to your browser:
{{newPassUrl}}

If you did not request this link, you can ignore this (only you have this message). This link will expire in {{linkLifeInMinutes}} minutes. If you suspect that someone is trying to access your account, please contact the system administrator.

Do not reply to this email, thank you.
      `,
    },
    // New pass link email [/END]

    // Pass changed notification email [START]
    {
      simpleId: 'passChangedEmail',
      name: { langKey: 'Password changed notification email' },
      description: { langKey: "Notification email template for a user's password change." },
      systemDocument: true,
      wrapperTemplateId: 'mainSysEmailWrapper',
      templateVarKeys: ['username'],
      subject: 'Your password has been changed',
      template: `
Your password was changed, {{username}}
---------------------------------------

This is a notification that your password was changed.

Do not reply to this email, thank you.
      `,
    },
    // Pass changed notification email [/END]

    // 2FA code email [START]
    {
      simpleId: '2FACodeEmail',
      name: { langKey: '2FA code email' },
      description: { langKey: '2-factor authorization email that has the code to login.' },
      systemDocument: true,
      wrapperTemplateId: 'mainSysEmailWrapper',
      templateVarKeys: ['twoFactorCode', 'twoFactorLifeInMinutes'],
      subject: 'Login Code [{{twoFactorCode}}]',
      template: `
Welcome back!
-------------

Here is your Two-Factor Authentication (2FA) Code:

### {{twoFactorCode}}

The 2FA Code (__{{twoFactorCode}}__) is valid for __{{twoFactorLifeInMinutes}}__ minutes and can be only used once.

If you are not trying to log in, you can ignore this (only you have this message). If you suspect that someone is trying to access your account, please contact the system administrator.

Do not reply to this email, thank you.
      `,
    },
    // 2FA code email [/END]

    // Delete own account email [START]
    {
      simpleId: 'deleteOwnAccountEmail',
      name: { langKey: 'Delete own account email' },
      description: { langKey: 'Email to send to user after they have deleted their own account.' },
      systemDocument: true,
      wrapperTemplateId: 'mainSysEmailWrapper',
      templateVarKeys: ['username'],
      subject: 'Account deleted',
      template: `
Goodbye
-------

Your account and your data has been deleted.
- Username: {{username}}

Thank you for being a user with us!

Do not reply to this email, thank you.
      `,
    },
    // Delete own account email [/END]
  ];
};

export default getEmails;
