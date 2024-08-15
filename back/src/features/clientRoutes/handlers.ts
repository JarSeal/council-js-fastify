import { dataPrivilegesQuery, type UserData } from '../../utils/userAndPrivilegeChecks';
import DBClientRouteModel, { type DBClientRoute } from '../../dbModels/clientRoute';
import type { TransText } from '../../dbModels/_modelTypePartials';

// @TODO: make this a shared type
export type Route = {
  path: string;
  componentId: string;
  layoutWrapperId?: string;
  meta?: { title?: TransText; description?: TransText };
  isActive?: boolean;
  params?: { [key: string]: string };
};

const NOT_FOUND_SIMPLE_ID = 'notFound404Path';

export const getUserClientRoutes = async (
  userData: UserData,
  csrfIsGood: boolean,
  currentPath: string
) => {
  userData;
  csrfIsGood;
  currentPath;

  // @TODO: create a user specific cache for the routes (store it in the session)

  const rawRoutes = await DBClientRouteModel.find<DBClientRoute>({
    $and: dataPrivilegesQuery(userData, csrfIsGood),
  })
    .lean()
    .select(['-_id', 'simpleId', 'componentId', 'layoutWrapperId', 'path', 'meta']);

  const routes: Route[] = [];
  let params: { [key: string]: string } = {};
  const notFoundView = rawRoutes.find((route) => route.simpleId === NOT_FOUND_SIMPLE_ID);
  let curRoute: Route = get404Route(notFoundView);

  for (let i = 0; i < rawRoutes.length; i++) {
    const rawRoute = rawRoutes[i];
    const route: Route = {
      path: rawRoute.path,
      componentId: rawRoute.componentId,
      ...(rawRoute.layoutWrapperId ? { layoutWrapperId: rawRoute.layoutWrapperId } : {}),
      ...(rawRoute.meta ? { meta: rawRoute.meta } : {}),
    };

    // Find active path
    const splitCurrentPath = currentPath.split('/');
    const splitRoutePath = route.path.split('/');
    let isActive = false;
    const curParams: { [key: string]: string } = {};
    if (splitCurrentPath.length === splitRoutePath.length) {
      for (let j = 0; j < splitCurrentPath.length; j++) {
        if (!splitRoutePath[j]?.startsWith(':')) {
          if (splitCurrentPath[j] === splitRoutePath[j]) {
            isActive = true;
            continue;
          }
        } else if (
          splitRoutePath[j]?.startsWith(':') &&
          splitRoutePath[j].length > 1 &&
          splitCurrentPath[j].length > 0
        ) {
          const paramKey = splitRoutePath[j].split(':')[1];
          if (paramKey) curParams[paramKey] = splitCurrentPath[j];
          isActive = true;
          continue;
        }
        isActive = false;
      }
    }
    if (Object.keys(curParams).length) route.params = curParams;
    if (isActive) {
      route.isActive = true;
      params = { ...curParams };
      curRoute = { ...route };
    }

    routes.push(route);
  }

  return { routes, params, curRoute, curPath: currentPath };
};

const get404Route = (notFoundView?: Route): Route => ({
  path: notFoundView?.path || '/sys/error/404',
  componentId: notFoundView?.componentId || 'viewNotFound404',
  ...(notFoundView?.layoutWrapperId ? { layoutWrapperId: notFoundView.layoutWrapperId } : {}),
  meta: { title: { langKey: '404 - Page not found' }, ...(notFoundView?.meta || {}) },
  isActive: true,
});
