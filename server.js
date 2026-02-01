require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Configure CORS for production
app.use(cors({
    origin: [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'https://xenztechnologies.in',
        'http://xenztechnologies.in',
        'https://www.xenztechnologies.in',
        'http://www.xenztechnologies.in'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Google Sheets Authentication
let sheets;
let sheetsReady = false;

async function initGoogleSheets() {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            console.log('Google Sheets credentials not configured. Data will be stored locally.');
            return;
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        sheets = google.sheets({ version: 'v4', auth });
        sheetsReady = true;
        console.log('Google Sheets connected successfully');
    } catch (error) {
        console.error('Failed to initialize Google Sheets:', error.message);
    }
}

initGoogleSheets();

// Local storage fallback (when Google Sheets is not configured)
let localStudents = [];

// Helper: Save to Google Sheets
async function saveToSheets(studentData) {
    if (!sheetsReady) {
        localStudents.push(studentData);
        console.log('Saved locally:', studentData);
        return true;
    }

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    studentData.name,
                    studentData.mobile,
                    studentData.email,
                    studentData.amount,
                    studentData.paymentId,
                    studentData.orderId,
                    studentData.enrolledAt
                ]]
            }
        });
        console.log('Saved to Google Sheets:', studentData);
        return true;
    } catch (error) {
        console.error('Failed to save to Sheets:', error.message);
        localStudents.push(studentData);
        return false;
    }
}

// Helper: Get all students from Google Sheets
async function getStudentsFromSheets() {
    if (!sheetsReady) {
        return localStudents;
    }

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:G'
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) return []; // Only header or empty

        return rows.slice(1).map(row => ({
            name: row[0] || '',
            mobile: row[1] || '',
            email: row[2] || '',
            amount: row[3] || '',
            paymentId: row[4] || '',
            orderId: row[5] || '',
            enrolledAt: row[6] || ''
        }));
    } catch (error) {
        console.error('Failed to fetch from Sheets:', error.message);
        return localStudents;
    }
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        sheetsConnected: sheetsReady,
        razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    });
});

// Get Razorpay Key (for frontend)
app.get('/api/razorpay-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// REMOVED: Unprotected meet-link endpoint was a security risk
// The meet link is now only returned through /api/verify-payment after successful payment verification

// Create Razorpay Order
app.post('/api/create-order', async (req, res) => {
    try {
        const { name, mobile, email } = req.body;

        if (!name || !mobile || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const options = {
            amount: parseInt(process.env.ENROLLMENT_PRICE) || 3700, // Amount in paise
            currency: 'INR',
            receipt: `xenz_${Date.now()}`,
            notes: {
                name,
                mobile,
                email
            }
        };

        const order = await razorpay.orders.create(options);
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify Payment and Save Student
app.post('/api/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            name,
            mobile,
            email
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Save student data
        const studentData = {
            name,
            mobile,
            email,
            amount: (parseInt(process.env.ENROLLMENT_PRICE) || 3700) / 100,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            enrolledAt: new Date().toISOString()
        };

        await saveToSheets(studentData);

        res.json({
            success: true,
            message: 'Payment verified and enrollment successful',
            meetLink: process.env.MEET_LINK
        });
    } catch (error) {
        console.error('Payment verification failed:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// ==================== ADMIN ROUTES ====================

// Simple middleware for admin auth
const adminAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'] || req.query.password;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Admin login verification
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get all students (admin only)
app.get('/api/students', adminAuth, async (req, res) => {
    try {
        const students = await getStudentsFromSheets();
        res.json(students);
    } catch (error) {
        console.error('Failed to fetch students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Get analytics (admin only)
app.get('/api/analytics', adminAuth, async (req, res) => {
    try {
        const students = await getStudentsFromSheets();

        const totalEnrollments = students.length;
        const totalRevenue = students.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

        // Group by date
        const enrollmentsByDate = {};
        students.forEach(s => {
            const date = s.enrolledAt ? s.enrolledAt.split('T')[0] : 'Unknown';
            enrollmentsByDate[date] = (enrollmentsByDate[date] || 0) + 1;
        });

        // Last 7 days data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push({
                date: dateStr,
                count: enrollmentsByDate[dateStr] || 0
            });
        }

        res.json({
            totalEnrollments,
            totalRevenue,
            enrollmentsByDate: last7Days,
            recentEnrollments: students.slice(-10).reverse()
        });
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Export to CSV (admin only)
app.get('/api/export', adminAuth, async (req, res) => {
    try {
        const students = await getStudentsFromSheets();

        const csvHeader = 'Name,Mobile,Email,Amount,Payment ID,Order ID,Enrolled At\n';
        const csvRows = students.map(s =>
            `"${s.name}","${s.mobile}","${s.email}","${s.amount}","${s.paymentId}","${s.orderId}","${s.enrolledAt}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=xenz-students.csv');
        res.send(csvHeader + csvRows);
    } catch (error) {
        console.error('Failed to export:', error);
        res.status(500).json({ error: 'Failed to export' });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║         XenZ Technologies Backend Server          ║
╠═══════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}         ║
║  Google Sheets: ${sheetsReady ? 'Connected' : 'Not configured (using local storage)'}
║  Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not configured'}
╚═══════════════════════════════════════════════════╝
    `);
});
