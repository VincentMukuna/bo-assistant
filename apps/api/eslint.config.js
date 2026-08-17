import { configApp } from '@adonisjs/eslint-config'
export default configApp({
  name: 'Kebab-case actions',
  files: ['app/actions/*.ts'],
  rules: {
    '@unicorn/filename-case': 'off',
  },
}, {
  name: 'Generated Lucid schema',
  files: ['database/schema.ts'],
  rules: {
    'prettier/prettier': 'off',
  },
})
