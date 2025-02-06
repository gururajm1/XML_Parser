import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import xml2js from 'xml2js';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());

app.use(cors({
  origin: 'http://localhost:3000' 
}));

interface CreditAccount {
  bank: string;
  accountNumber: string;
  amountOverdue: number;
  currentBalance: number;
  address: string;
}

interface CreditReport {
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
}

const creditAccountSchema = new mongoose.Schema({
  bank: String,
  accountNumber: String,
  amountOverdue: Number,
  currentBalance: Number,
  address: String,
});

const creditReportSchema = new mongoose.Schema({
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

const CreditReport = mongoose.model('CreditReport', creditReportSchema);

const encryptionKey = crypto.randomBytes(32); 
const algorithm = 'aes-256-cbc';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const formatAddress = (addressDetails: any): string => {
  if (!addressDetails) return 'N/A';
  const components = [
    addressDetails.First_Line_Of_Address_non_normalized,
    addressDetails.Second_Line_Of_Address_non_normalized,
    addressDetails.Third_Line_Of_Address_non_normalized,
    addressDetails.City_non_normalized,
    addressDetails.State_non_normalized,
    addressDetails.ZIP_Postal_Code_non_normalized,
    addressDetails.CountryCode_non_normalized,
  ].filter((component) => component && component !== '');
  return components.join(', ');
};

app.use(express.json());

const upload = multer({ dest: 'uploads/' });

mongoose.connect('mongodb+srv://gururajm1:gururajjj@cluster0.udttf.mongodb.net/user')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error) => console.error('MongoDB connection error:', error));

async function processXMLAndSaveToMongoDB(filePath: string): Promise<CreditReport> {
  try {
    const xmlData = await fs.promises.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);

    const profileResponse = result.INProfileResponse;
    if (!profileResponse) {
      throw new Error('Invalid XML structure: INProfileResponse not found');
    }

    const currentApplicant = profileResponse.Current_Application?.Current_Application_Details?.Current_Applicant_Details;
    const caisAccounts = profileResponse.CAIS_Account?.CAIS_Account_DETAILS;
    const accountList = Array.isArray(caisAccounts) ? caisAccounts : caisAccounts ? [caisAccounts] : [];

    const creditReport: CreditReport = {
      basicInfo: {
        name: `${currentApplicant?.First_Name || ''} ${currentApplicant?.Last_Name || ''}`.trim(),
        mobilePhone: encrypt(currentApplicant?.MobilePhoneNumber || 'N/A'),
        pan: encrypt(accountList[0]?.CAIS_Holder_Details?.Income_TAX_PAN || 'N/A'),
        creditScore: parseInt(profileResponse.SCORE?.BureauScore || '0'),
      },
      summary: {
        totalAccounts: parseInt(profileResponse.CAIS_Account?.CAIS_Summary?.Credit_Account?.CreditAccountTotal || '0'),
        activeAccounts: parseInt(profileResponse.CAIS_Account?.CAIS_Summary?.Credit_Account?.CreditAccountActive || '0'),
        closedAccounts: parseInt(profileResponse.CAIS_Account?.CAIS_Summary?.Credit_Account?.CreditAccountClosed || '0'),
        currentBalanceAmount: accountList.reduce(
          (sum: number, account: any) => sum + parseInt(account.Current_Balance || '0'),
          0
        ),
        securedAmount: parseInt(profileResponse.CAIS_Account?.CAIS_Summary?.Total_Outstanding_Balance?.Outstanding_Balance_Secured || '0'),
        unsecuredAmount: parseInt(profileResponse.CAIS_Account?.CAIS_Summary?.Total_Outstanding_Balance?.Outstanding_Balance_UnSecured || '0'),
        last7DaysCreditEnquiries: parseInt(profileResponse.CAPS?.CAPS_Summary?.CAPSLast7Days || '0'),
      },
      creditAccounts: accountList.map((account: any) => ({
        bank: account.Subscriber_Name || 'N/A',
        accountNumber: encrypt(account.Account_Number || 'N/A'),
        amountOverdue: parseInt(account.Amount_Past_Due || '0'),
        currentBalance: parseInt(account.Current_Balance || '0'),
        address: formatAddress(account.CAIS_Holder_Address_Details),
      })),
    };

    const newCreditReport = new CreditReport(creditReport);
    await newCreditReport.save();
    
    await fs.promises.unlink(filePath);
    
    console.log('Credit report saved successfully:', newCreditReport._id);

    return creditReport;
  } catch (error) {
    console.error('Error processing XML:', error);
    throw error;
  }
}

app.post('/api/upload-xml', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file?.path) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const creditReport = await processXMLAndSaveToMongoDB(req.file.path);

    const decryptedCreditReport = {
      basicInfo: {
        name: creditReport.basicInfo.name,
        mobilePhone: decrypt(creditReport.basicInfo.mobilePhone),
        pan: decrypt(creditReport.basicInfo.pan),
        creditScore: creditReport.basicInfo.creditScore,
      },
      summary: creditReport.summary,
      creditAccounts: creditReport.creditAccounts.map(account => ({
        ...account,
        accountNumber: decrypt(account.accountNumber),
      })),
    };

    const responseData = JSON.stringify(decryptedCreditReport);

    res.status(200).json({ data: responseData });
    console.log(responseData); 
  } catch (error) {
    next(error);
  }
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: error instanceof Error ? error.message : 'Unknown error' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
