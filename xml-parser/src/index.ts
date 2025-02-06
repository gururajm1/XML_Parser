import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import xml2js from 'xml2js';
import cors from 'cors';
const app = express();
app.use(cors());


app.use(cors({
  origin: 'http://localhost:3000' // or your frontend URL
}));


// Types
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

// MongoDB Schema
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

// Initialize Express and configure middleware
//const app = express();
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// MongoDB connection
mongoose.connect('mongodb+srv://gururajm1:gururajjj@cluster0.udttf.mongodb.net/user')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Process XML and save to MongoDB
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
        mobilePhone: currentApplicant?.MobilePhoneNumber || 'N/A',
        pan: accountList[0]?.CAIS_Holder_Details?.Income_TAX_PAN || 'N/A',
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
        accountNumber: account.Account_Number || 'N/A',
        amountOverdue: parseInt(account.Amount_Past_Due || '0'),
        currentBalance: parseInt(account.Current_Balance || '0'),
        address: formatAddress(account.CAIS_Holder_Address_Details),
      })),
    };

    const newCreditReport = new CreditReport(creditReport);
    await newCreditReport.save();
    
    // Clean up uploaded file
    await fs.promises.unlink(filePath);
    
    console.log('Credit report saved successfully:', newCreditReport._id);

    // Return the credit report data for the response
    return creditReport;
  } catch (error) {
    console.error('Error processing XML:', error);
    throw error;
  }
}

// Upload endpoint with proper typing
app.post('/api/upload-xml', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file?.path) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Process XML and save to MongoDB, returning the parsed credit report
    const creditReport = await processXMLAndSaveToMongoDB(req.file.path);

    // Convert parsed data into stringified objects for sending back
    const response = {
      name: creditReport.basicInfo.name,
      mobilePhone: creditReport.basicInfo.mobilePhone,
      pan: creditReport.basicInfo.pan,
      creditScore: creditReport.basicInfo.creditScore,
      reportSummary: JSON.stringify({
        totalAccounts: creditReport.summary.totalAccounts,
        activeAccounts: creditReport.summary.activeAccounts,
        closedAccounts: creditReport.summary.closedAccounts,
        currentBalanceAmount: creditReport.summary.currentBalanceAmount,
        securedAccountsAmount: creditReport.summary.securedAmount,
        unsecuredAccountsAmount: creditReport.summary.unsecuredAmount,
        last7DaysCreditEnquiries: creditReport.summary.last7DaysCreditEnquiries,
      }),
      creditAccountsInformation: JSON.stringify(creditReport.creditAccounts.map(account => ({
        creditCards: account.bank,
        banksOfCreditCards: account.bank,
        addresses: account.address,
        accountNumbers: account.accountNumber,
        amountOverdue: account.amountOverdue,
        currentBalance: account.currentBalance,
      }))),
    };


    // Send back the response with stringified objects
    res.status(200).json(response);
    console.log(response);
    console.log("-------------");
  } catch (error) {
    next(error);
  }
});


// Error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: error instanceof Error ? error.message : 'Unknown error' 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});