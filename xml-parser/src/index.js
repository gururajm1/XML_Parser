"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const xml2js_1 = __importDefault(require("xml2js"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000' // or your frontend URL
}));
// MongoDB Schema
const creditAccountSchema = new mongoose_1.default.Schema({
    bank: String,
    accountNumber: String,
    amountOverdue: Number,
    currentBalance: Number,
    address: String,
});
const creditReportSchema = new mongoose_1.default.Schema({
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
const CreditReport = mongoose_1.default.model('CreditReport', creditReportSchema);
const formatAddress = (addressDetails) => {
    if (!addressDetails)
        return 'N/A';
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
app.use(express_1.default.json());
// Configure multer for file uploads
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// MongoDB connection
mongoose_1.default.connect('mongodb+srv://gururajm1:gururajjj@cluster0.udttf.mongodb.net/user')
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((error) => console.error('MongoDB connection error:', error));
// Process XML and save to MongoDB
function processXMLAndSaveToMongoDB(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        try {
            const xmlData = yield fs_1.default.promises.readFile(filePath, 'utf-8');
            const parser = new xml2js_1.default.Parser({ explicitArray: false });
            const result = yield parser.parseStringPromise(xmlData);
            const profileResponse = result.INProfileResponse;
            if (!profileResponse) {
                throw new Error('Invalid XML structure: INProfileResponse not found');
            }
            const currentApplicant = (_b = (_a = profileResponse.Current_Application) === null || _a === void 0 ? void 0 : _a.Current_Application_Details) === null || _b === void 0 ? void 0 : _b.Current_Applicant_Details;
            const caisAccounts = (_c = profileResponse.CAIS_Account) === null || _c === void 0 ? void 0 : _c.CAIS_Account_DETAILS;
            const accountList = Array.isArray(caisAccounts) ? caisAccounts : caisAccounts ? [caisAccounts] : [];
            const creditReport = {
                basicInfo: {
                    name: `${(currentApplicant === null || currentApplicant === void 0 ? void 0 : currentApplicant.First_Name) || ''} ${(currentApplicant === null || currentApplicant === void 0 ? void 0 : currentApplicant.Last_Name) || ''}`.trim(),
                    mobilePhone: (currentApplicant === null || currentApplicant === void 0 ? void 0 : currentApplicant.MobilePhoneNumber) || 'N/A',
                    pan: ((_e = (_d = accountList[0]) === null || _d === void 0 ? void 0 : _d.CAIS_Holder_Details) === null || _e === void 0 ? void 0 : _e.Income_TAX_PAN) || 'N/A',
                    creditScore: parseInt(((_f = profileResponse.SCORE) === null || _f === void 0 ? void 0 : _f.BureauScore) || '0'),
                },
                summary: {
                    totalAccounts: parseInt(((_j = (_h = (_g = profileResponse.CAIS_Account) === null || _g === void 0 ? void 0 : _g.CAIS_Summary) === null || _h === void 0 ? void 0 : _h.Credit_Account) === null || _j === void 0 ? void 0 : _j.CreditAccountTotal) || '0'),
                    activeAccounts: parseInt(((_m = (_l = (_k = profileResponse.CAIS_Account) === null || _k === void 0 ? void 0 : _k.CAIS_Summary) === null || _l === void 0 ? void 0 : _l.Credit_Account) === null || _m === void 0 ? void 0 : _m.CreditAccountActive) || '0'),
                    closedAccounts: parseInt(((_q = (_p = (_o = profileResponse.CAIS_Account) === null || _o === void 0 ? void 0 : _o.CAIS_Summary) === null || _p === void 0 ? void 0 : _p.Credit_Account) === null || _q === void 0 ? void 0 : _q.CreditAccountClosed) || '0'),
                    currentBalanceAmount: accountList.reduce((sum, account) => sum + parseInt(account.Current_Balance || '0'), 0),
                    securedAmount: parseInt(((_t = (_s = (_r = profileResponse.CAIS_Account) === null || _r === void 0 ? void 0 : _r.CAIS_Summary) === null || _s === void 0 ? void 0 : _s.Total_Outstanding_Balance) === null || _t === void 0 ? void 0 : _t.Outstanding_Balance_Secured) || '0'),
                    unsecuredAmount: parseInt(((_w = (_v = (_u = profileResponse.CAIS_Account) === null || _u === void 0 ? void 0 : _u.CAIS_Summary) === null || _v === void 0 ? void 0 : _v.Total_Outstanding_Balance) === null || _w === void 0 ? void 0 : _w.Outstanding_Balance_UnSecured) || '0'),
                    last7DaysCreditEnquiries: parseInt(((_y = (_x = profileResponse.CAPS) === null || _x === void 0 ? void 0 : _x.CAPS_Summary) === null || _y === void 0 ? void 0 : _y.CAPSLast7Days) || '0'),
                },
                creditAccounts: accountList.map((account) => ({
                    bank: account.Subscriber_Name || 'N/A',
                    accountNumber: account.Account_Number || 'N/A',
                    amountOverdue: parseInt(account.Amount_Past_Due || '0'),
                    currentBalance: parseInt(account.Current_Balance || '0'),
                    address: formatAddress(account.CAIS_Holder_Address_Details),
                })),
            };
            const newCreditReport = new CreditReport(creditReport);
            yield newCreditReport.save();
            // Clean up uploaded file
            yield fs_1.default.promises.unlink(filePath);
            console.log('Credit report saved successfully:', newCreditReport._id);
            // Return the credit report data for the response
            return creditReport;
        }
        catch (error) {
            console.error('Error processing XML:', error);
            throw error;
        }
    });
}
// Upload endpoint with proper typing
app.post('/api/upload-xml', upload.single('file'), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.file) === null || _a === void 0 ? void 0 : _a.path)) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // Process XML and save to MongoDB, returning the parsed credit report
        const creditReport = yield processXMLAndSaveToMongoDB(req.file.path);
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
    }
    catch (error) {
        next(error);
    }
}));
// Error handler
app.use((error, req, res, next) => {
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
