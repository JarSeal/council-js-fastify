import { getUserData } from '../../utils/userAndPrivilegeChecks.js';
import type { CustomAfterFn } from './index.js';
import { getRequiredActionsFromUser } from '../../utils/requiredLoginChecks.js';

export const checkAndSetRequiredActions: CustomAfterFn = {
  name: { langKey: 'Check and set required actions to session' },
  description: {
    langKey:
      "Checks user's required actions and sets them to session. This should be run after user data alternating changes.",
  },
  afterFn: async ({ req }) => {
    // Do a clean get of the user data from DB
    const updatedUserData = await getUserData(req, true);
    // Check all required actions again
    const requiredActions = await getRequiredActionsFromUser(updatedUserData);
    // Write to req.session.requiredActions and save to sessionStore
    req.session.requiredActions = requiredActions;

    return { ok: true };
  },
};
