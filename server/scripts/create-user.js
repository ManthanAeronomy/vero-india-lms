import 'dotenv/config'
import mongoose from 'mongoose'

import { User } from '../src/models/User.js'
import { hashPassword } from '../src/utils/auth.js'

async function createUser() {
  const uri = process.env.MONGODB_URI
  const name = String(process.env.USER_NAME ?? '').trim()
  const email = String(process.env.USER_EMAIL ?? '').trim().toLowerCase()
  const password = String(process.env.USER_PASSWORD ?? '')

  if (!uri) {
    console.error('Set MONGODB_URI in server/.env')
    process.exit(1)
  }

  if (!name || !email || !password) {
    console.error('Set USER_NAME, USER_EMAIL, and USER_PASSWORD before running this script')
    process.exit(1)
  }

  await mongoose.connect(uri)

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    console.error(`User already exists for ${email}`)
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)
  const user = new User({ name, email, passwordHash })
  await user.save()

  console.log(`Created user ${email}`)
  process.exit(0)
}

createUser().catch((err) => {
  console.error(err)
  process.exit(1)
})
