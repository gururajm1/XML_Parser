import express from 'express';
import { uploadReportModel } from '../controllers/reportController';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload-xml', upload.single('file'), uploadReportModel);

export default router;