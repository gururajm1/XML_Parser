import mongoose, { Document, Schema } from 'mongoose';

export interface CreditAccount {
  bank: string;
  accountNumber: string;
  amountOverdue: number;
  currentBalance: number;
  address: string;
}

export interface ReportModel extends Document {
  basicInfo: {
    name: string;
    mobilePhone: string;
    pan: string;
    creditScore: number;
  };
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    closedAccounts: number;
    currentBalanceAmount: number;
    securedAmount: number;
    unsecuredAmount: number;
    last7DaysCreditEnquiries: number;
  };
  creditAccounts: CreditAccount[];
  createdAt: Date;
}

const creditAccountSchema = new Schema<CreditAccount>({
  bank: String,
  accountNumber: String,
  amountOverdue: Number,
  currentBalance: Number,
  address: String,
});

const creditReportSchema = new Schema<ReportModel>({
  basicInfo: {
    name: String,
    mobilePhone: String,
    pan: String,
    creditScore: Number,
  },
  summary: {
    totalAccounts: Number,
    activeAccounts: Number,
    closedAccounts: Number,
    currentBalanceAmount: Number,
    securedAmount: Number,
    unsecuredAmount: Number,
    last7DaysCreditEnquiries: Number,
  },
  creditAccounts: [creditAccountSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ReportModelModel = mongoose.model<ReportModel>('ReportModel', creditReportSchema);