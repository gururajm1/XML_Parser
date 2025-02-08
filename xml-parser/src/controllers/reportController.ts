import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import xml2js from 'xml2js';
import { ReportModelModel, CreditAccount } from '../models/reportModel'; 
import { encrypt, decrypt } from '../utils/encryption';

export const uploadReportModel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file?.path) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const creditReport = await processXMLAndSaveToMongoDB(req.file.path);

    const decryptedReportModel = {
      basicInfo: {
        name: creditReport.basicInfo.name,
        mobilePhone: decrypt(creditReport.basicInfo.mobilePhone),
        pan: decrypt(creditReport.basicInfo.pan),
        creditScore: creditReport.basicInfo.creditScore,
      },
      summary: creditReport.summary,
      creditAccounts: creditReport.creditAccounts.map((account: CreditAccount) => ({
        ...account,
        accountNumber: decrypt(account.accountNumber),
      })),
    };

    const responseData = JSON.stringify(decryptedReportModel);

    res.status(200).json({ data: responseData });
    console.log(responseData);
  } catch (error) {
    next(error);
  }
};

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

const processXMLAndSaveToMongoDB = async (filePath: string): Promise<any> => {
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

    const creditReport = {
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

    const newReportModel = new ReportModelModel(creditReport);
    await newReportModel.save();

    await fs.promises.unlink(filePath);

    console.log('Credit report saved successfully:', newReportModel._id);

    return creditReport;
  } catch (error) {
    console.error('Error processing XML:', error);
    throw error;
  }
};