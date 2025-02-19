const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// إعداد حساب Gmail (مثال) - يجب تغيير البيانات لبريدك الفعلي
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "khaled.deutschland2016@gmail.com", // بريد جيميل
    pass: "1&1350660"          // كلمة مرور جيميل
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

    const mailOptions = {
      from: '"Bestell-System" <khaled.deutschland2016@gmail.com>',
      to: "yaseen.designservice@gmail.com",
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
