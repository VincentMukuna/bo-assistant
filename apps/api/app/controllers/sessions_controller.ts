import createSession from '#actions/create-session'
import UserTransformer from '#transformers/user_transformer'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionsController {
  async store({ auth, request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await createSession(auth, email, password)
    return serialize(UserTransformer.transform(user))
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.noContent()
  }
}
