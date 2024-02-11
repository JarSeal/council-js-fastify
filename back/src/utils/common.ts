import { IS_TEST, getSysSetting } from '../core/config';

export const isEmailEnabled = async () => {
  const useEmail = await getSysSetting<boolean>('useEmail');
  const hasEmailHost = IS_TEST || Boolean(await getSysSetting<string>('emailHost'));
  const hasEmailUser = IS_TEST || Boolean(await getSysSetting<string>('emailUser'));
  const hasEmailPass = IS_TEST || Boolean(await getSysSetting<string>('emailPass'));
  const hasEmailPort = IS_TEST || Boolean(await getSysSetting<string>('emailPort'));
  return useEmail && hasEmailHost && hasEmailUser && hasEmailPass && hasEmailPort;
};

export const is2FAEnabled = async () => {
  const use2FA = await getSysSetting<string>('use2FA');

  let userEnabled = false;
  if (use2FA === 'DISABLED' || (await isEmailEnabled())) {
    return false;
  } else if (use2FA?.startsWith('USER_CHOOSES')) {
    // @TODO: get user setting for 2FA
    userEnabled = false;
  }

  if (use2FA === 'ENABLED' || userEnabled) return true;

  return false;
};
