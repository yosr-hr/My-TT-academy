import { Schema, model, models } from "mongoose";

const PresenceSchema = new Schema(
  {
    formationId: { type: Schema.Types.ObjectId, ref: "Formation", required: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["present", "absent", "justified"], required: true },
  },
  { timestamps: true }
);

PresenceSchema.index({ formationId: 1, agentId: 1, date: 1 }, { unique: true });

export default models.Presence || model("Presence", PresenceSchema);
