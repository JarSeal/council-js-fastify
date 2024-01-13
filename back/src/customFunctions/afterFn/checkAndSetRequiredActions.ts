import type { CustomAfterFn } from '.';

export const checkAndSetRequiredActions: CustomAfterFn = {
  name: { langKey: 'Check and set required actions to session' },
  description: {
    langKey:
      "Checks user's required actions and sets them to session. This should be run after user data alternating changes.",
  },
  afterFn: (dataId, form, userData, req) => {
    dataId;
    form;
    userData;
    req;
    // @TODO: do a clean get of the user data from DB
    // @TODO: check all required actions again
    // @TODO: write to req.session.requiredActions and save to sessionStore
  },
};
