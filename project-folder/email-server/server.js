const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// === إعداد بيانات SMTP الخاصة بـ Mailgun ===
const transporter = nodemailer.createTransport({
  host: "smtp.mailgun.org",       
  port: 587,                      
  secure: false,                 
  auth: {
    user: "postmaster@sandboxa19e2bd5256d4cf88688a2d01d7bf94f.mailgun.org",
    pass: "67f06203ab958dc2aa3913d0c7c37861-ac3d5f74-b6df9637"
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

    // عدّل from & to بما يناسبك:
    const mailOptions = {
      from: '"Bestell-System" <postmaster@sandboxa19e2bd5256d4cf88688a2d01d7bf94f.mailgun.org>',
      to: "Yaseen.designservice@gmail.com", // البريد الذي سيستقبل الطلب
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
