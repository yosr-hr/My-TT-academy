import { Schema, model, models } from "mongoose";

const DemandeSchema = new Schema(
  {
    formationId: { type: Schema.Types.ObjectId, ref: "Formation", required: true },
    agent: {
      name: { type: String, required: true, trim: true },
      grade: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
    formation: {
      code: { type: String, required: true, trim: true },
      module: { type: String, required: true, trim: true },
    },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    assignedAt: { type: Date, required: false },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  },
  { timestamps: true }
);

DemandeSchema.index({ "agent.email": 1, formationId: 1 }, { unique: true });

export default models.Demande || model("Demande", DemandeSchema);
