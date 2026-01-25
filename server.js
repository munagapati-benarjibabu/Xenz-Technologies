const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Use JSON body parser for endpoints except webhook which needs raw body
app.use(bodyParser.json());

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt_meta } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount (in paise) is required' });

    const options = {
      amount: parseInt(amount, 10),
      currency,
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.json({ order, keyId: RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Unable to create order' });
  }
});

// Verify payment endpoint
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, receipt_meta } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing parameters' });
  }

  const generated_signature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = generated_signature === razorpay_signature;

  if (isValid) {
    console.log('Payment verified for order:', razorpay_order_id, 'payment:', razorpay_payment_id);
    // TODO: persist in DB
    return res.json({ verified: true });
  } else {
    console.warn('Payment verification failed', { razorpay_order_id, razorpay_payment_id });
    return res.status(400).json({ verified: false });
  }
});

// Webhook endpoint: use raw body parser for signature verification
app.post('/webhook', bodyParser.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const payload = req.body;
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn('No webhook secret configured; webhook verification skipped');
    return res.status(400).end();
  }
  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');
  if (signature === expected) {
    const event = JSON.parse(payload.toString('utf8'));
    console.log('Webhook verified. event:', event.event);
    // handle events
    return res.status(200).json({ ok: true });
  } else {
    console.warn('Invalid webhook signature');
    return res.status(400).json({ ok: false });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
