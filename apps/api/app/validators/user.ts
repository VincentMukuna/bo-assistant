import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)

export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})
