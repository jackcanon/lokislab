import { cookies } from 'next/headers';
import crypto from 'crypto';

const PASSWORD = 'lokislabjack';
const COOKIE_NAME = 'lokislab_admin_session';
const SALT = 'lokislab-admin-v1';

export const ADMIN_PASSWORD_HASH = crypto
  .createHash('sha256')
  .update(PASSWORD + SALT)
  .digest('hex');

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === ADMIN_PASSWORD_HASH;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}
