import type { FastifyError, RouteHandler } from 'fastify';
import bcrypt from 'bcrypt';

import type { LoginRoute } from './schemas';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import { errors } from '../../core/errors';
import { getConfig, getSysSetting } from '../../core/config';
import { getTimestamp, getTimestampFromDate } from '../../utils/timeAndDate';
import { getRequiredActionsFromUser } from '../../utils/requiredLoginChecks';
import { getUserData } from '../../utils/userAndPrivilegeChecks';
import { validateLoginMethod } from '../../utils/validation';

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
  const email = loginMethod === 'email' ? usernameOrEmail : null;
  const pass = body.pass.trim();
  const agentId = body.agentId;

  // Find user
  let user;
  if (loginMethod === 'username') {
    user = await DBUserModel.findOne<DBUser>({ simpleId: username });
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

  // @TODO: check 2-factor authentication need here and res.send if it is, when implemented

  // Reset login attempts and log login
  const logAndResetLoginAttemptsError = await logAndResetLoginAttempts(user, agentId);
  if (logAndResetLoginAttemptsError) {
    return res.send(logAndResetLoginAttemptsError);
  }

  // Create session
  req.session.isSignedIn = true;
  req.session.username = user.simpleId;
  req.session.userId = user._id;
  req.session.agentId = agentId;

  // Check user action requirements
  const userData = await getUserData(req);
  const requiredActions = await getRequiredActionsFromUser(userData);
  req.session.requiredActions = requiredActions;

  return res.status(200).send({ ok: true, requiredActions });
};

// Check cool down
const checkCoolDown = async (user: DBUser, agentId: string): Promise<null | FastifyError> => {
  if (!user.security.isUnderCoolDown) {
    return null;
  }

  if (!user.security.coolDownStarted) {
    // coolDownStarted was empty, reset it (shouldn't happen)
    let error, savedUser;
    user.security.coolDownStarted = new Date();
    try {
      savedUser = await DBUserModel.findOneAndUpdate<DBUser>(
        { simpleId: user.simpleId },
        { security: user.security },
        { new: true }
      );
    } catch (err) {
      error = `Error while trying to update coolDownStarted (coolDownStarted was 'null'): ${JSON.stringify(
        err
      )}`;
    }
    if (!savedUser || error) {
      return new errors.DB_UPDATE_USER(
        error || 'savedUser returned empty in update coolDownStarted because it was null'
      );
    }
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
    let error, savedUser;
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
    let maxLoginsAttempted = false;
    if (maxLoginAttempts <= loginAttempts) {
      user.security.coolDownStarted = new Date();
      user.security.isUnderCoolDown = true;
      maxLoginsAttempted = true;
    }
    try {
      savedUser = await DBUserModel.findOneAndUpdate<DBUser>(
        { simpleId: user.simpleId },
        { security: user.security },
        { new: true }
      );
    } catch (err) {
      error = `Error while trying to update loginAttempts${
        maxLoginsAttempted ? ' (maxLoginAttempts reached)' : ''
      }: ${JSON.stringify(err)}`;
    }
    if (!savedUser || error) {
      return new errors.DB_UPDATE_USER(
        error ||
          `savedUser returned empty in update loginAttempts${
            maxLoginsAttempted ? ' (maxLoginAttempts reached)' : ''
          }`
      );
    }
  }
  return null;
};

// Reset login attempts
const logAndResetLoginAttempts = async (
  user: DBUser,
  agentId: string,
  doNotLog?: boolean
): Promise<null | FastifyError> => {
  let error, savedUser;
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
  try {
    savedUser = await DBUserModel.findOneAndUpdate<DBUser>(
      { simpleId: user.simpleId },
      { security: user.security },
      { new: true }
    );
  } catch (err) {
    error = `Error while trying to reset loginAttempts, coolDownStarted, and isUnderCoolDown: ${JSON.stringify(
      err
    )}`;
  }
  if (!savedUser || error) {
    return new errors.DB_UPDATE_USER(
      error ||
        'savedUser returned empty in reset loginAttempts, coolDownStarted, and isUnderCoolDown'
    );
  }
  return null;
};
