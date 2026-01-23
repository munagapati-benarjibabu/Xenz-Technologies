const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

/* ================= FILE PATH ================= */
const DATA_FILE = path.join(__dirname, "students.json");

/* ============ SAFE FILE INIT ============ */
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

/* ============ OTP STORE ============ */
/*
{
  "+919XXXXXXXXX": {
    otp: "123456",
    expiresAt: 1234567890
  }
}
*/
let otpStore = {};

/* =================================================
   SEND OTP
================================================= */
app.post("/send-otp", (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.json({ success: false, message: "Mobile required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[mobile] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  };

  console.log("OTP for", mobile, ":", otp);

  res.json({ success: true, message: "OTP sent successfully" });
});

/* =================================================
   VERIFY OTP
================================================= */
app.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  const record = otpStore[mobile];

  if (!record) {
    return res.json({ success: false, message: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[mobile];
    return res.json({ success: false, message: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.json({ success: false, message: "Invalid OTP" });
  }

  delete otpStore[mobile];
  res.json({ success: true });
});

/* =================================================
   COUPON VALIDATION (ONE TIME PER MOBILE)
================================================= */
app.post("/validate-coupon", (req, res) => {
  const { mobile, coupon, planAmount } = req.body;

  const VALID_COUPON = "M09B84";
  const DISCOUNT_AMOUNT = 28;

  const students = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  const alreadyUsed = students.some(
    s => s.mobile === mobile && s.coupon === VALID_COUPON
  );

  if (coupon !== VALID_COUPON) {
    return res.json({
      success: false,
      message: "Invalid coupon",
      amount: planAmount
    });
  }

  if (alreadyUsed) {
    return res.json({
      success: false,
      message: "Coupon already used for this mobile",
      amount: planAmount
    });
  }

  res.json({
    success: true,
    message: "Coupon applied",
    amount: DISCOUNT_AMOUNT
  });
});

/* =================================================
   SAVE STUDENT (PAYMENT = PENDING)
================================================= */
app.post("/save-student", (req, res) => {
  const { name, mobile, email, amount, coupon, status, paymentId } = req.body;

  if (!name || !mobile || !amount) {
    return res.json({ success: false, message: "Missing fields" });
  }

  const students = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  students.push({
    name,
    mobile,
    email: email || null,
    amount,
    coupon: coupon || null,
    paymentId: paymentId || null,
    status: status || "PENDING",
    date: new Date().toISOString()
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));

  res.json({ success: true });
});

/* =================================================
   ADMIN – GET ALL STUDENTS
================================================= */
app.get("/students", (req, res) => {
  const students = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  res.json(students);
});

/* =================================================
   ADMIN – VERIFY PAYMENT + WHATSAPP (STEP F)
================================================= */
app.post("/verify-payment", (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.json({ success: false, message: "Mobile required" });
  }

  const students = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const index = students.findIndex(s => s.mobile === mobile);

  if (index === -1) {
    return res.json({ success: false, message: "Student not found" });
  }

  students[index].status = "VERIFIED";
  students[index].verifiedAt = new Date().toISOString();

  fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));

  /* 📩 WhatsApp message */
  const message = encodeURIComponent(
    `Hi XenZ Team,\n\n` +
    `Payment of ₹${students[index].amount} is done.\n` +
    `Please share the Google Meet link.\n\n` +
    `Mobile: ${students[index].mobile}`
  );

  const whatsappUrl = `https://wa.me/919640084068?text=${message}`;
  // 🔴 Replace number above with your WhatsApp number

  res.json({
    success: true,
    whatsappUrl
  });
});

/* =================================================
   SERVER START
================================================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
