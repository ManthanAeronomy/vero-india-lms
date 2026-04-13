import mongoose from "mongoose";

/** Allowed values for `channel` (integrations may omit; default is `other`). */
export const LEAD_CHANNELS = ["indiamart", "website", "whatsapp", "justdial", "email", "referral", "3m", "other"];
export const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
export const LEAD_PRIORITIES = ["High", "Medium", "Low"];

const channelLabelMap = {
  indiamart: "IndiaMART",
  website: "Website",
  whatsapp: "WhatsApp",
  justdial: "JustDial",
  email: "Email",
  referral: "Referral",
  "3m": "3M",
  other: "Other",
};

const commentSchema = new mongoose.Schema(
{
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  message: { type: String, required: true, trim: true },
},
{
  timestamps: { createdAt: true, updatedAt: false },
  _id: true,
}
);

const leadSchema = new mongoose.Schema(
{
  name: { type: String, required: false, default: "" },
  company: { type: String, required: false, default: "" },
  email: { type: String, required: false, default: "" },
  phone: { type: String, required: false, default: "" },

  channel: { type: String, enum: LEAD_CHANNELS, required: false, lowercase: true, default: "other" },

  stage: { type: String, enum: LEAD_STAGES, default: "New" },
  priority: { type: String, enum: LEAD_PRIORITIES, default: "Medium" },

  value: { type: Number, default: 0 },

  assignedTo: { type: String, default: "" },

  meetingAt: { type: Date, default: null },
  meetingLocation: { type: String, default: "" },

  meetingSiteVisit: {
    address: { type: String, default: "" },
    postalCode: { type: String, default: "" },
  },

  notes: { type: String, default: "" },
  location: { type: String, default: "" },
  comments: { type: [commentSchema], default: [] }
},
{
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      ret.channel = channelLabelMap[ret.channel] ?? ret.channel;
      ret.assignedTo = ret.assignedTo ?? "";
      ret.meetingAt = ret.meetingAt ? ret.meetingAt.toISOString() : "";
      ret.meetingLocation = ret.meetingLocation ?? "";
      ret.meetingSiteVisit = ret.meetingSiteVisit ?? {};
      ret.meetingSiteVisit = {
        address: ret.meetingSiteVisit?.address ?? "",
        postalCode: ret.meetingSiteVisit?.postalCode ?? "",
      };
      ret.comments = (ret.comments ?? []).map((comment) => ({
        id: comment._id.toString(),
        authorId: comment.authorId,
        authorName: comment.authorName,
        message: comment.message,
        createdAt: comment.createdAt ? comment.createdAt.toISOString() : "",
      }));
      ret.createdAt = ret.createdAt?.toISOString().slice(0, 10);
      ret.lastActivity = ret.updatedAt?.toISOString().slice(0, 10);
      delete ret.updatedAt;
      return ret;
    }
  }
}
);

export const Lead = mongoose.model("Lead", leadSchema);