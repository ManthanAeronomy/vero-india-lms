import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'team_member'], default: null },
    passwordHash: { type: String, required: true, select: false },
    sessions: { type: [sessionSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        delete ret.sessions
        ret.role = ret.role ?? null
        return ret
      },
    },
  }
)

export const User = mongoose.model('User', userSchema)
