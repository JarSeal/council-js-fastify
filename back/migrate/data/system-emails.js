const getEmails = () => {
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
      description: { langKey: 'Welcome email for newly registered users.' },
      systemDocument: true,
      templateVarKeys: [
        'appName',
        'username',
        'verifyEmailUrl',
        'sysLoginUrl',
        'newPassRequestUrl',
      ],
      subject: 'Welcome to {{appName}}',
      template: `
Welcome
-------

Your new account has been registered:
- Username: {{username}}

Please verify your email address by following this link:
[verify email]({{verifyEmailUrl}})

You can either [login]({{sysLoginUrl}}) or if you don't have a password,  
you can [create a new password]({{newPassRequestUrl}}) for you.

Do not reply to this email, thank you.

/Beacon JS
      `,
    },
    // Welcome email [/END]
  ];
};
