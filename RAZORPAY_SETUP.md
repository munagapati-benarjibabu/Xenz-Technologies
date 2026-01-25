# Razorpay Integration Guide

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Get Razorpay Credentials
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up or log in
3. Navigate to **Settings → API Keys**
4. Copy your **Key ID** and **Key Secret**

### 3. Configure Environment Variables
Create a `.env` file in the `backend/` directory:

```
RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
PORT=5000
NODE_ENV=development
```

### 4. Update Frontend
In `frontend/enroll.html`, update the Razorpay key (line with `"key":`):
```javascript
"key": "your_key_id_here", // Replace with your actual key
```

## API Endpoints

### Create Order
**POST** `/create-order`
```json
{
  "amount": 38,
  "currency": "INR"
}
```

### Verify Payment
**POST** `/verify-payment`
```json
{
  "razorpay_order_id": "order_123456",
  "razorpay_payment_id": "pay_123456",
  "razorpay_signature": "signature_hash"
}
```

### Save Student
**POST** `/save-student`
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "email": "john@example.com",
  "amount": 38,
  "paymentId": "pay_123456",
  "status": "PENDING"
}
```

### Verify Payment (Admin)
**POST** `/verify-payment-admin`
```json
{
  "mobile": "9876543210"
}
```

## Running the Server

```bash
npm start          # Production
npm run dev        # Development with nodemon
```

The server will run on `http://localhost:5000`

## Security Notes

⚠️ **Important:**
- Never commit `.env` file with real credentials
- Keep your `RAZORPAY_KEY_SECRET` private
- Always verify signatures on the backend before processing payments
- Use HTTPS in production
- Implement proper CORS restrictions

## Testing

Use Razorpay test credentials:
- Key ID: `rzp_test_xxxxxxxxxxx`
- Key Secret: `test_key_secret_here`

Test card: `4111 1111 1111 1111` with any future expiry

## Troubleshooting

1. **"Razorpay is not defined"**
   - Ensure `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>` is in HTML

2. **Payment verification fails**
   - Check that `RAZORPAY_KEY_SECRET` is correct in `.env`
   - Ensure signature validation is correct

3. **CORS errors**
   - Check backend CORS configuration
   - Ensure frontend URL is whitelisted in Razorpay dashboard

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Node SDK](https://github.com/razorpay/razorpay-node)
- [Integration Examples](https://razorpay.com/docs/integration/)
