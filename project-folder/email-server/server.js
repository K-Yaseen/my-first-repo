const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// === إعداد بيانات SMTP لـ Mailgun بدلاً من Gmail ===
const transporter = nodemailer.createTransport({
  host: "smtp.mailgun.org",        // مضيف Mailgun
  port: 587,                       // غالبًا 587 (TLS) أو 465 (SSL)
  secure: false,                   // إذا استخدمت 465 قد تحتاج وضعه true
  auth: {
    user: "postmaster@YOUR_DOMAIN",  // بريد SMTP مثلاً postmaster@yourdomain
    pass: "YOUR_MAILGUN_SMTP_PASSWORD"  // كلمة مرور SMTP من Mailgun
  }
});

app.post("/send-order", async (req, res) => {
  try {
    const { orderId, items, customer, schedule, totalPrice } = req.body;

    let mailSubject = `Neue Bestellung: ${orderId}`;
    let mailBody = `Hallo,\n\nSie haben eine neue Bestellung!\n\n`;
    mailBody += `Bestellnummer: ${orderId}\n`;
    mailBody += `Gesamtbetrag: ${totalPrice} €\n\n`;

    mailBody += `=== Artikel ===\n`;
    items.forEach(item => {
      mailBody += `- ${item.name} (Menge: ${item.quantity})\n`;
    });

    mailBody += `\n=== Kundendaten ===\n`;
    mailBody += `Name: ${customer.vorname} ${customer.nachname}\n`;
    mailBody += `Adresse: ${customer.strasse} ${customer.hausnummer}, ${customer.plz} ${customer.stadt}\n`;
    mailBody += `Notizen: ${customer.notes}\n\n`;

    if (schedule.pickupDate) {
      mailBody += `Abholdatum: ${schedule.pickupDate}\nAbholzeit: ${schedule.pickupTime}\n`;
    }
    if (schedule.deliveryDate) {
      mailBody += `Lieferdatum: ${schedule.deliveryDate}\nLieferzeit: ${schedule.deliveryTime}\n`;
    }

    // عدّل from & to بما يناسبك
    const mailOptions = {
      from: '"Bestell-System" <postmaster@YOUR_DOMAIN>',
      to: "Yaseen.designservice@gmail.com", // أو أي بريد تريد الإرسال إليه
      subject: mailSubject,
      text: mailBody
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
