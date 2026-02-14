

import mongoose, { Schema, Document } from 'mongoose';

export interface ICase extends Document {
  logError: string;
  report: any;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

const CaseSchema: Schema = new Schema(
  {
    logError: { type: String, required: true },
    report: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

// Add archived flag for soft-deletes / archival
(CaseSchema as any).add({ archived: { type: Boolean, required: true, default: false } });

export default mongoose.model<ICase>('Case', CaseSchema);