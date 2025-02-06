import fs from 'fs';
import xml2js from 'xml2js';
import mongoose from 'mongoose';

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
  }
});

// MongoDB Model
const CreditReport = mongoose.model('CreditReport', creditReportSchema);

// Function to format address
const formatAddress = (addressDetails: any): string => {
  if (!addressDetails) return 'N/A';
  
  const components = [
    addressDetails.First_Line_Of_Address_non_normalized,
    addressDetails.Second_Line_Of_Address_non_normalized,
    addressDetails.Third_Line_Of_Address_non_normalized,
    addressDetails.City_non_normalized,
    addressDetails.State_non_normalized,
    addressDetails.ZIP_Postal_Code_non_normalized,
    addressDetails.CountryCode_non_normalized
  ].filter(component => component && component !== '');
  
  return components.join(', ');
};

// MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://gururajm1:gururajjj@cluster0.udttf.mongodb.net/';

// Main function to process XML and save to MongoDB
async function processXMLAndSaveToMongoDB(): Promise<void> {
  try {
    // Connect to MongoDB Atlas with options
    await mongoose.connect(MONGODB_URI, {
      // These options are included by default in newer versions of Mongoose
      // but explicitly stating them for clarity
     // useNewUrlParser: true,
   //   useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB Atlas');

    // Read XML file
    const xmlData = await fs.promises.readFile('./data/example.xml', 'utf-8');
    
    // Parse XML
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    
    const profileResponse = result.INProfileResponse;
    
    if (!profileResponse) {
      throw new Error('Invalid XML structure: INProfileResponse not found');
    }

    // Extract data
    const currentApplicant = profileResponse.Current_Application?.Current_Application_Details?.Current_Applicant_Details;
    const caisAccounts = profileResponse.CAIS_Account?.CAIS_Account_DETAILS;
    const accountList = Array.isArray(caisAccounts) ? caisAccounts : caisAccounts ? [caisAccounts] : [];

    // Prepare credit report data
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
        currentBalanceAmount: accountList.reduce((sum: number, account: any) => 
          sum + parseInt(account.Current_Balance || '0'), 0),
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

    // Save to MongoDB
    const newCreditReport = new CreditReport(creditReport);
    await newCreditReport.save();
    
    console.log('Credit report saved successfully!');
    console.log('Document ID:', newCreditReport._id);

    // Optional: Print saved data
    console.log('\nSaved Credit Report:');
    console.log(JSON.stringify(creditReport, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the main function
processXMLAndSaveToMongoDB();