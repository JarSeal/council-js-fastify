import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';

export const csrfHeader = { headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } };
