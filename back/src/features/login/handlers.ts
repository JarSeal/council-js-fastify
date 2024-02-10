import type { FastifyError, FastifyRequest, RouteHandler } from 'fastify';
import bcrypt from 'bcrypt';

import type { LoginRoute, RequiredActions, TwoFactorLoginRoute } from './schemas';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import { errors } from '../../core/errors';
import {
  IS_TEST,
  getAppName,
  getConfig,
  getPublicSysSettings,
  getSysSetting,
} from '../../core/config';
import { getTimestamp, getTimestampFromDate } from '../../utils/timeAndDate';
import { getRequiredActionsFromUser } from '../../utils/requiredLoginChecks';
import { getUserData } from '../../utils/userAndPrivilegeChecks';
import { validateLoginMethod } from '../../utils/validation';
import { sendEmail } from '../../core/email';
import { logger } from '../../core/app';

// BASIC LOGIN ROUTE
// ********************************
export const login: RouteHandler<LoginRoute> = async (req, res) => {
  const body = req.body;
  const usernameOrEmail = body.usernameOrEmail.trim();
  const loginMethod = body.loginMethod;

  // Check loginMethod
  const validateLoginMethodError = await validateLoginMethod(loginMethod);
  if (validateLoginMethodError) {
    return res.send(validateLoginMethodError);
  }

  let username = loginMethod === 'username' ? usernameOrEmail : null;
  let email = loginMethod === 'email' ? usernameOrEmail : null;
  const pass = body.pass.trim();
  const agentId = body.agentId;

  // Find user
  let user;
  if (loginMethod === 'username') {
    user = await DBUserModel.findOne<DBUser>({ simpleId: username });
    email = user ? user.emails[0].email : null;
  } else {
    user = await DBUserModel.findOne<DBUser>({ 'emails.email': email });
    username = user ? user.simpleId : null;
  }
  if (!user?._id) {
    return res.send(new errors.LOGIN_USER_OR_PASS_WRONG(loginMethod));
  }

  // Check password
  const passCorrect = await bcrypt.compare(pass, user.passwordHash);
  if (!passCorrect) {
    // Add loginAttempt and set isUnderCoolDown if max attempts
    const error = await setInvalidLoginAttempt(user, agentId);
    if (error) {
      return res.send(error);
    }

    const isUnderCoolDown = await checkCoolDown(user, agentId);
    if (isUnderCoolDown) {
      return res.send(isUnderCoolDown);
    }
    return res.send(new errors.LOGIN_USER_OR_PASS_WRONG(loginMethod));
  } else {
    const isUnderCoolDown = await checkCoolDown(user, agentId);
    if (isUnderCoolDown) {
      return res.send(isUnderCoolDown);
    }
  }

  // Get public settings
  const publicSettings = await getPublicSysSettings();

  // Check user action requirements
  const userData = await getUserData(req);
  const requiredActions = await getRequiredActionsFromUser(userData);

  // Check 2FA
  if (await checkIf2FAEnabled()) {
    // Check if already in a 2FA session
    const twoFASessionAge = (await getSysSetting<number>('twoFASessionAgeInMin')) || 30;
    const timestampNow = new Date().getTime();
    let expirationTime =
      user.security.twoFA.date && twoFASessionAge
        ? twoFASessionAge * 60000 + user.security.twoFA.date.getTime()
        : 0;
    let twoFASessionOngoing = false;
    if (timestampNow < expirationTime) {
      twoFASessionOngoing = true;

      // Check if user is trying to resend for the second time and check interval.
      // This means that after the initial code is sent the user can request another
      // code right away, but for the next code the user has to wait RESEND_INTERVAL_IN_MINUTES
      // before another code can be sent. Note, if the code cannot be sent, the user is not notified.
      const RESEND_INTERVAL_IN_MINUTES = 2;
      expirationTime = user.security.twoFA.resendDate
        ? RESEND_INTERVAL_IN_MINUTES * 60000 + user.security.twoFA.resendDate.getTime()
        : 0;
      if (timestampNow < expirationTime) {
        const resetError = await logAndResetLoginAttempts(user, agentId, true);
        if (resetError) return res.send(resetError);
        req.log.info(
          `User (id: ${user._id.toString()}) tried to get a new 2FA code while in session, but has to wait ${RESEND_INTERVAL_IN_MINUTES} minutes before another one can be sent.`
        );
        return res.send({
          ok: true,
          twoFactorUser: username as string,
          requiredActions,
          publicSettings,
        });
      }
    }

    const resetError = await logAndResetLoginAttempts(user, agentId, true);
    if (resetError) return res.send(resetError);

    // Create code (and date) and save it to user
    const code = generate2FACode();
    user.security.twoFA = {
      code,
      date: new Date(),
      resendDate: twoFASessionOngoing ? new Date() : null,
    };
    const updateError = await updateDBUser(
      { simpleId: user.simpleId },
      { security: user.security }
    );
    if (updateError) return res.send(updateError);

    if (email) {
      await sendEmail({
        to: email,
        templateId: '2FACodeEmail',
        templateVars: {
          appName: await getAppName(),
          twoFactorCode: code,
          twoFactorLifeInMinutes: (await getSysSetting<number>('twoFASessionAgeInMin')) || '~30',
        },
      });
    } else {
      return res.send(new errors.GENERAL_ERROR('User primary email not found for 2FA'));
    }

    return res.send({
      ok: true,
      twoFactorUser: username as string,
      requiredActions,
      publicSettings,
    });
  }

  // Reset login attempts and log login
  const logAndResetLoginAttemptsError = await logAndResetLoginAttempts(user, agentId);
  if (logAndResetLoginAttemptsError) {
    return res.send(logAndResetLoginAttemptsError);
  }

  // Create session
  createSession(req, user, agentId, requiredActions);

  return res.status(200).send({ ok: true, requiredActions, publicSettings });
};

// TWO-FACTOR AUTHENTICATION ROUTE:
// ********************************
export const twoFALogin: RouteHandler<TwoFactorLoginRoute> = async (req, res) => {
  const body = req.body;
  const username = body.username;
  const code = body.code;
  const agentId = body.agentId;

  // Find user
  const user = await DBUserModel.findOne<DBUser>({ simpleId: username });
  if (!user) {
    return res.send(new errors.LOGIN_2FA_SESSION_EXPIRED_OR_MISSING());
  }

  // Check 2FA session and code
  const twoFASessionAge = (await getSysSetting<number>('twoFASessionAgeInMin')) || 30;
  const timestampNow = new Date().getTime();
  const expirationTime =
    user.security.twoFA.date && twoFASessionAge
      ? twoFASessionAge * 60000 + user.security.twoFA.date.getTime()
      : 0;
  const twoFASessionExpired = timestampNow > expirationTime;
  if (!user.security.twoFA.code || twoFASessionExpired || code !== user.security.twoFA.code) {
    // Add loginAttempt and set isUnderCoolDown if max attempts
    const error = await setInvalidLoginAttempt(user, agentId);
    if (error) {
      return res.send(error);
    }

    const isUnderCoolDown = await checkCoolDown(user, agentId);
    if (isUnderCoolDown) {
      user.security.twoFA = { code: null, date: null, resendDate: null };
      await updateDBUser({ simpleId: user.simpleId }, { security: user.security });
      return res.send(isUnderCoolDown);
    }

    if (user.security.twoFA.code && !twoFASessionExpired && code !== user.security.twoFA.code) {
      return res.send(new errors.LOGIN_2FA_CODE_WRONG());
    }

    return res.send(new errors.LOGIN_2FA_SESSION_EXPIRED_OR_MISSING());
  } else {
    const isUnderCoolDown = await checkCoolDown(user, agentId);
    if (isUnderCoolDown) {
      user.security.twoFA = { code: null, date: null, resendDate: null };
      await updateDBUser({ simpleId: user.simpleId }, { security: user.security });
      return res.send(isUnderCoolDown);
    }
  }

  // Reset login attempts and log login
  const logAndResetLoginAttemptsError = await logAndResetLoginAttempts(user, agentId);
  if (logAndResetLoginAttemptsError) {
    return res.send(logAndResetLoginAttemptsError);
  }

  // Get public settings
  const publicSettings = await getPublicSysSettings();

  // Check user action requirements
  const userData = await getUserData(req);
  const requiredActions = await getRequiredActionsFromUser(userData);

  // Create session and empty 2FA security data
  createSession(req, user, agentId, requiredActions);
  user.security.twoFA = { code: null, date: null, resendDate: null };
  const updateError = await updateDBUser({ simpleId: user.simpleId }, { security: user.security });
  if (updateError) return updateError;

  return res.send({ ok: true, requiredActions, publicSettings });
};

// UTILS:
// ********************************

// Check cool down
const checkCoolDown = async (user: DBUser, agentId: string): Promise<null | FastifyError> => {
  if (!user.security.isUnderCoolDown) {
    return null;
  }

  if (!user.security.coolDownStarted) {
    // coolDownStarted was empty, reset it (shouldn't happen)
    user.security.coolDownStarted = new Date();
    const updateError = await updateDBUser(
      { simpleId: user.simpleId },
      { security: user.security }
    );
    if (updateError) return updateError;
  }

  // Check if user is still under cool down period
  const coolDownAge =
    (await getSysSetting<number>('coolDownAge')) || getConfig<number>('security.coolDownAge', 240);
  if (getTimestampFromDate(user.security.coolDownStarted) + coolDownAge > getTimestamp()) {
    // User is under cool down period
    return new errors.LOGIN_USER_UNDER_COOLDOWN(
      `loginAttempts: ${user.security.loginAttempts || 'undefined'}, ` +
        `coolDownStarted: ${user.security.coolDownStarted.toDateString()} ${
          process.env.TZ || ''
        }, ` +
        `coolDownTime: ${coolDownAge}, userId: ${user._id?.toString() || ''}`
    );
  } else {
    // User is not anymore under cool down,
    // reset loginAttempts, isUnderCoolDown, and reset coolDownStarted
    const error = await logAndResetLoginAttempts(user, agentId, true);
    if (error) {
      return error;
    }
  }

  return null;
};

// Set invalid login attempt
const setInvalidLoginAttempt = async (
  user: DBUser,
  agentId: string
): Promise<null | FastifyError> => {
  if (!user.security.isUnderCoolDown) {
    const maxLoginAttempts =
      (await getSysSetting<number>('maxLoginAttempts')) ||
      getConfig<number>('security.maxLoginAttempts', 4);
    const maxLoginAttemptLogs =
      (await getSysSetting<number>('maxLoginAttemptLogs')) ||
      getConfig<number>('security.maxLoginAttemptLogs', 5);
    const loginAttempts = (user.security.loginAttempts || 0) + 1;
    user.security.loginAttempts = loginAttempts;
    user.security.lastLoginAttempts =
      maxLoginAttemptLogs !== 0
        ? [{ date: new Date(), agentId }, ...user.security.lastLoginAttempts].splice(
            0,
            maxLoginAttemptLogs
          )
        : [{ date: new Date(), agentId }, ...user.security.lastLoginAttempts];
    if (maxLoginAttempts <= loginAttempts) {
      user.security.coolDownStarted = new Date();
      user.security.isUnderCoolDown = true;
    }
    const updateError = await updateDBUser(
      { simpleId: user.simpleId },
      { security: user.security }
    );
    if (updateError) return updateError;
  }
  return null;
};

// Reset login attempts
const logAndResetLoginAttempts = async (
  user: DBUser,
  agentId: string,
  doNotLog?: boolean
): Promise<null | FastifyError> => {
  user.security.loginAttempts = 0;
  user.security.coolDownStarted = null;
  user.security.isUnderCoolDown = false;
  if (!doNotLog) {
    const maxLoginLogs =
      (await getSysSetting<number>('maxLoginLogs')) || getConfig<number>('security.maxLoginLogs');
    user.security.lastLogins =
      maxLoginLogs !== 0
        ? [{ date: new Date(), agentId }, ...user.security.lastLogins].splice(0, maxLoginLogs)
        : [{ date: new Date(), agentId }, ...user.security.lastLogins];
  }
  const updateError = await updateDBUser({ simpleId: user.simpleId }, { security: user.security });
  if (updateError) return updateError;

  return null;
};

const checkIf2FAEnabled = async () => {
  const use2FA = await getSysSetting<string>('use2FA');
  const useEmail = await getSysSetting<boolean>('useEmail');
  const hasEmailHost = Boolean(await getSysSetting<string>('emailHost'));
  const hasEmailUser = Boolean(await getSysSetting<string>('emailUser'));
  const hasEmailPass = Boolean(await getSysSetting<string>('emailPass'));
  const hasEmailPort = Boolean(await getSysSetting<string>('emailPort'));
  let userEnabled = false;
  if (
    use2FA === 'DISABLED' ||
    !useEmail ||
    !hasEmailHost ||
    !hasEmailUser ||
    !hasEmailPass ||
    !hasEmailPort
  ) {
    return false;
  } else if (use2FA?.startsWith('USER_CHOOSES')) {
    // @TODO: get user setting for 2FA
    userEnabled = false;
  }

  if (use2FA === 'ENABLED' || userEnabled) return true;

  return false;
};

export const updateDBUser = async (
  find: { [key: string]: unknown },
  update: { [key: string]: unknown },
  errMsg?: string
): Promise<null | FastifyError> => {
  let savedUser, error;
  try {
    savedUser = await DBUserModel.findOneAndUpdate<DBUser>(find, update, { new: true });
  } catch (err) {
    error = errMsg
      ? `${errMsg}: : ${JSON.stringify(err)}`
      : `Error while trying to update user (updateUser util in login): ${JSON.stringify(err)}`;
  }
  if (!savedUser || error) {
    return new errors.DB_UPDATE_USER(
      error || 'savedUser returned empty (updateUser util in login)'
    );
  }

  return null;
};

export const generate2FACode = () => {
  const CODE_LENGTH = 6;
  const CODE_SOURCE_CHARS = '0123456789QWERTY';
  let result = '';
  if (IS_TEST) {
    for (let i = 0; i < CODE_LENGTH; i++) {
      result += CODE_SOURCE_CHARS.charAt(i);
    }
  } else {
    const charactersLength = CODE_SOURCE_CHARS.length;
    for (let i = 0; i < CODE_LENGTH; i++) {
      result += CODE_SOURCE_CHARS.charAt(Math.floor(Math.random() * charactersLength));
    }
  }
  return result;
};

const createSession = (
  req: FastifyRequest,
  user: DBUser,
  agentId: string,
  requiredActions: RequiredActions
) => {
  logger.info(`User logged in (id: '${user._id ? user._id?.toString() : '-'}'). Session created.`);
  if (!user._id) return;
  req.session.isSignedIn = true;
  req.session.username = user.simpleId;
  req.session.userId = user._id;
  req.session.agentId = agentId;
  req.session.requiredActions = requiredActions;
};
