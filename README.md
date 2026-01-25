# XenZ Enrollment System

Student enrollment platform for XenZ Technologies AI training with Razorpay payment integration, OTP verification, and admin dashboard.

## 🚀 Features

- **Payment Processing** - Razorpay integration for secure payments
- **OTP Verification** - 5-minute expiry OTP system
- **Coupon System** - One-time use coupons per mobile number
- **Admin Dashboard** - Payment verification and student tracking
- **WhatsApp Integration** - Automated notifications to students

## 📁 Project Structure

```
frontend/          # HTML/CSS/JS enrollment pages (no build required)
├── index.html    # Landing page
├── enroll.html   # Payment form with Razorpay
├── admin.html    # Admin dashboard
└── ...

backend/          # Node.js/Express API
├── server.js     # Main server
├── students.json # Student database
└── package.json
```

## 🛠️ Setup

### Backend
```bash
cd backend
npm install
npm start          # Runs on PORT=5000
```

### Frontend
- Open `frontend/index.html` in browser (no build step needed)
- Or use live server on port 5500

## 🔑 Configuration

Update these values before deployment:

1. **Razorpay Key** - `frontend/enroll.html` line ~100
   ```
   "key": "YOUR_RAZORPAY_KEY_ID"
   ```

2. **Google Meet Link** - `frontend/enroll.html` line ~65
   ```
   href="https://meet.google.com/YOUR_MEET_ID"
   ```

3. **WhatsApp Number** - `backend/server.js` line ~180
   ```
   https://wa.me/919640084068  // Replace with your number
   ```

## 📊 API Endpoints

- `POST /send-otp` - Send OTP to mobile
- `POST /verify-otp` - Verify OTP
- `POST /validate-coupon` - Validate and apply coupon
- `POST /save-student` - Save student enrollment
- `GET /students` - Get all students (admin)
- `POST /verify-payment` - Verify payment (admin)

## 📝 Data Flow

```
User Registration
    ↓
OTP Verification
    ↓
Razorpay Payment
    ↓
Save Student (PENDING)
    ↓
Admin Verification
    ↓
Send WhatsApp & Meet Link
```

## 🎨 Styling

All pages use CSS custom properties for consistent theming:
```css
--bg-dark: #050b1e
--accent: #4dd6ff
--muted: #b7c0ff
```

## 📦 Dependencies

**Backend:**
- Express.js
- CORS
- Body Parser
- Nodemon (dev)

**Frontend:**
- Vanilla HTML/CSS/JS
- Razorpay Checkout SDK

## 🔒 Security Notes

- Frontend validation is cosmetic only - always validate on backend
- OTP stored in-memory (5 min expiry)
- One coupon per mobile enforced server-side
- No authentication on admin endpoints (restrict in production)

## 📄 License

Proprietary - XenZ Technologies

---

For AI Agent guidance, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
