import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default async function createSession(
  auth: HttpContext['auth'],
  email: string,
  password: string
) {
  const user = await User.verifyCredentials(email, password)
  await auth.use('web').login(user)
  return user
}
