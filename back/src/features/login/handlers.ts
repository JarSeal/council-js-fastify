import type { FastifyError, RouteHandler } from 'fastify';
import bcrypt from 'bcrypt';

import type { LoginRoute } from './schemas';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import { errors } from '../../core/errors';
import { getConfig } from '../../core/config';
import { getTimestamp, getTimestampFromDate } from '../utils/timeAndDate';

export const login: RouteHandler<LoginRoute> = async (req, res) => {
  const body = req.body;
  const usernameOrEmail = body.usernameOrEmail.trim();
  const loginMethod = body.loginMethod;
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
  if (!user) {
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
    return res.send(new errors.LOGIN_USER_OR_PASS_WRONG());
  } else {
    const isUnderCoolDown = await checkCoolDown(user, agentId);
    if (isUnderCoolDown) {
      return res.send(isUnderCoolDown);
    }
  }

  // Reset login attempts and log login
  const logAndResetLoginAttemptsError = await logAndResetLoginAttempts(user, agentId);
  if (logAndResetLoginAttemptsError) {
    return res.send(logAndResetLoginAttemptsError);
  }

  req.session.isSignedIn = true;
  req.session.username = user.simpleId;
  req.session.userId = String(user.id);

  return res.status(200).send({ ok: true });
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
  const coolDownAge = getConfig<number>('user.coolDownAge'); // @TODO: make this a system setting
  if (getTimestampFromDate(user.security.coolDownStarted) + coolDownAge > getTimestamp()) {
    // User is under cool down period
    return new errors.LOGIN_USER_UNDER_COOLDOWN(
      `loginAttempts: ${user.security.loginAttempts || 'undefined'}, ` +
        `coolDownStarted: ${user.security.coolDownStarted.toDateString()}`
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
    const maxLoginAttempts = getConfig<number>('user.maxLoginAttempts'); // @TODO: make this a system setting
    const maxLoginAttemptLogs = getConfig<number>('user.maxLoginAttemptLogs'); // @TODO: make this a system setting
    const loginAttempts = (user.security.loginAttempts || 0) + 1;
    user.security.loginAttempts = loginAttempts;
    user.security.lastLoginAttempts = [
      { date: new Date(), agentId },
      ...user.security.lastLoginAttempts,
    ].splice(0, maxLoginAttemptLogs);
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
    const maxLoginLogs = getConfig<number>('user.maxLoginLogs'); // @TODO: make this a system setting
    user.security.lastLogins = [{ date: new Date(), agentId }, ...user.security.lastLogins].splice(
      0,
      maxLoginLogs
    );
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
