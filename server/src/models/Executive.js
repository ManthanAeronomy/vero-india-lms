import mongoose from 'mongoose';

const executiveSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    region: { type: String, required: true, default: '' },
    email: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Executive = mongoose.model('Executive', executiveSchema);
