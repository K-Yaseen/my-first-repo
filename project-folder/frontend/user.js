// ================================================
// ملف user.js (منطق Baseline + الكشف عن تعديلات adminPanel)
// مع عرض تفاصيل التعديلات في مودال يجب تأكيده من المستخدم
// ================================================

let items = [];
const userDataStore = {};
let currentItem = null; // لتخزين الصنف الحالي بعد البحث

// دالة مساعدة لتحويل سلسلة JSON بشكل آمن
function safeJSONParse(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    return null;
  }
}

// ✅ دالة تعيد قائمة بالاختلافات بين صنفين (Baseline vs. Current)
function getDifferences(oldItem, newItem) {
  if (!oldItem || !newItem) return [];

  const diffs = [];

  // الاسم
  if (oldItem.name !== newItem.name) {
    diffs.push(`Name: "${oldItem.name}" → "${newItem.name}"`);
  }

  // السعر
  if (oldItem.price !== newItem.price) {
    const oldPrice = (oldItem.price != null) ? oldItem.price : "N/A";
    const newPrice = (newItem.price != null) ? newItem.price : "N/A";
    diffs.push(`Preis: ${oldPrice} € → ${newPrice} €`);
  }

  // المكونات
  if (oldItem.ingredients !== newItem.ingredients) {
    const oldIng = oldItem.ingredients || "N/A";
    const newIng = newItem.ingredients || "N/A";
    diffs.push(`Zutaten: "${oldIng}" → "${newIng}"`);
  }

  // التوفّر
  if (oldItem.available !== newItem.available) {
    const oldAvail = oldItem.available ? "Verfügbar" : "Nicht verfügbar";
    const newAvail = newItem.available ? "Verfügbar" : "Nicht verfügbar";
    diffs.push(`Verfügbarkeit: ${oldAvail} → ${newAvail}`);
  }

  // القسم
  if (oldItem.category !== newItem.category) {
    const oldCat = oldItem.category || "N/A";
    const newCat = newItem.category || "N/A";
    diffs.push(`Kategorie: "${oldCat}" → "${newCat}"`);
  }

  return diffs;
}

// ✅ دالة تعرض المودال وتدرج التعديلات فيه، ولا تسمح بتخطيه إلا عند ضغط زر "Verstanden"
function showDifferencesModal(changes) {
  const modal = document.getElementById("changesModal");
  const changesList = document.getElementById("changesList");
  const confirmBtn = document.getElementById("changesConfirmBtn");

  if (!modal || !changesList || !confirmBtn) {
    console.error("changesModal elements not found in HTML.");
    return;
  }

  changesList.innerHTML = "";
  let html = "<ul style='list-style: disc; padding-left: 20px;'>";
  changes.forEach(diff => {
    html += `<li>${diff}</li>`;
  });
  html += "</ul>";

  changesList.innerHTML = html;
  modal.style.display = "flex";
  confirmBtn.onclick = () => {
    modal.style.display = "none";
  };
}

// ✅ جلب الأصناف من Firebase باستخدام async/await ومعالجة الأخطاء
async function fetchItems() {
  try {
    const snapshot = await database.ref("items").once("value");
    const data = snapshot.val();
    items = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
  } catch (error) {
    console.error("Error fetching items:", error);
    showFloatingMessage("Fehler beim Abrufen der Artikel.", "red");
  }
}

// ✅ حفظ الـ Baseline للصنف فقط إذا كان من لوحة "firstPanel"
function storeBaselineIfFirstPanel(item) {
  if (!item || item.id == null) return;
  const storageKey = "initialItem_" + item.id;
  if (!localStorage.getItem(storageKey)) {
    if (item.lastUpdateSource === "firstPanel") {
      localStorage.setItem(storageKey, JSON.stringify(item));
    }
  }
}

// ✅ البحث عن الصنف وعرض الحالة
function checkItem() {
  const itemNumberInput = document.getElementById("itemNumber");
  const itemNumber = itemNumberInput ? itemNumberInput.value.trim() : "";
  const result = document.getElementById("result");
  const orderDetails = document.getElementById("orderDetails");

  if (!itemNumber) {
    result.innerText = "Bitte geben Sie eine Artikelnummer ein.";
    result.style.color = "red";
    orderDetails.style.display = "none";
    document.getElementById("addToCartBtn").style.display = "none";
    return;
  }

  const item = items.find((i) => i.id == itemNumber);
  if (item) {
    storeBaselineIfFirstPanel(item);
    const storageKey = "initialItem_" + item.id;
    const storedInitial = localStorage.getItem(storageKey);
    const baseline = storedInitial ? safeJSONParse(storedInitial) : null;

    if (item.lastUpdateSource === "adminPanel" && baseline) {
      const changes = getDifferences(baseline, item);
      if (changes.length > 0) {
        showDifferencesModal(changes);
      }
    }

    result.innerText = `✅ Gericht ${item.id} ist ${item.available ? "Verfügbar" : "Nicht verfügbar"}`;
    result.style.color = item.available ? "green" : "red";

    if (item.available) {
      orderDetails.style.display = "block";
      currentItem = item;
      // عرض زر "In den Warenkorb" عند إيجاد صنف متوفر
      document.getElementById("addToCartBtn").style.display = "block";
    } else {
      orderDetails.style.display = "none";
      document.getElementById("addToCartBtn").style.display = "none";
    }
  } else {
    result.innerText = "⚠️ Artikelnummer nicht gefunden.";
    result.style.color = "gray";
    orderDetails.style.display = "none";
    document.getElementById("addToCartBtn").style.display = "none";
  }
}

// دالة لإضافة الصنف الحالي إلى السلة
function addToCart() {
  if (!currentItem) return;
  const cartList = document.getElementById("cartList");
  // التأكد من عدم وجود الصنف بالفعل في السلة
  const existingItem = cartList.querySelector(`li[data-item-id="${currentItem.id}"]`);
  if (existingItem) {
    // زيادة الكمية إذا كان الصنف موجودًا
    const qtySpan = existingItem.querySelector(".cart-quantity-value");
    let qty = parseInt(qtySpan.innerText);
    qtySpan.innerText = qty + 1;
  } else {
    // إنشاء عنصر جديد للسلة
    const li = document.createElement("li");
    li.className = "cart-item";
    li.setAttribute("data-item-id", currentItem.id);
    li.innerHTML = `
      <span class="cart-item-name">${currentItem.name}</span>
      <div class="cart-quantity" style="display: inline-flex; align-items: center; margin-left: 10px;">
        <button type="button" onclick="decreaseCartQuantity(this)" style="font-size: small;">-</button>
        <span class="cart-quantity-value" style="margin: 0 10px;">1</span>
        <button type="button" onclick="increaseCartQuantity(this)" style="font-size: small;">+</button>
      </div>
      <button type="button" class="remove-cart-item" onclick="removeCartItem(this)" style="margin-left: 10px;">Entfernen</button>
    `;
    cartList.appendChild(li);
  }
  // إظهار حاوية السلة
  document.getElementById("cartContainer").style.display = "block";
  // إخفاء زر الإضافة بعد الإضافة (يمكن إعادة ظهوره عند بحث صنف جديد)
  document.getElementById("addToCartBtn").style.display = "none";
  // مسح حقل رقم الصنف لإمكانية بحث صنف جديد
  document.getElementById("itemNumber").value = "";
  document.getElementById("result").innerText = "";
  currentItem = null;
}

// دوال زيادة/نقصان الكمية داخل السلة
function increaseCartQuantity(button) {
  const qtySpan = button.parentElement.querySelector(".cart-quantity-value");
  let qty = parseInt(qtySpan.innerText);
  qtySpan.innerText = qty + 1;
}

function decreaseCartQuantity(button) {
  const qtySpan = button.parentElement.querySelector(".cart-quantity-value");
  let qty = parseInt(qtySpan.innerText);
  if (qty > 1) {
    qtySpan.innerText = qty - 1;
  }
}

// دالة إزالة عنصر من السلة
function removeCartItem(button) {
  const li = button.parentElement;
  li.remove();
  // إذا أصبحت السلة فارغة، أخفي الحاوية
  const cartList = document.getElementById("cartList");
  if (cartList.children.length === 0) {
    document.getElementById("cartContainer").style.display = "none";
  }
}

// ✅ توليد رقم الطلب العشوائي (مرة واحدة فقط)
function generateOrderNumber() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "123456789";
  let orderId = "";
  for (let i = 0; i < 2; i++) {
    orderId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 3; i++) {
    orderId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return orderId;
}

// ✅ عرض رسالة منبثقة للحفظ مع حفظ بيانات المستخدم
function showSavePopup() {
  const popup = document.getElementById("popupMessage");
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, 3000);
  saveUserData();
}

// ✅ حفظ بيانات المستخدم في LocalStorage (مع التحقق الإضافي)
function saveUserData() {
  const deliveryOption = document.getElementById("deliveryOption").value;
  const userData = {
    deliveryOption: deliveryOption,
    vorname: document.getElementById("vorname").value.trim(),
    nachname: document.getElementById("nachname").value.trim(),
    strasse: document.getElementById("strasse").value.trim(),
    hausnummer: document.getElementById("hausnummer").value.trim(),
    plz: document.getElementById("plz").value.trim(),
    stadt: document.getElementById("stadt").value.trim(),
    notes: document.getElementById("customerNotes").value.trim(),
  };

  if (deliveryOption === "delivery") {
    userData.deliveryDate = document.getElementById("deliveryDate").value.trim();
    userData.deliveryTime = document.getElementById("deliveryTime").value.trim();
  } else if (deliveryOption === "pickup") {
    userData.pickupDate = document.getElementById("pickupDate").value.trim();
    userData.pickupTime = document.getElementById("pickupTime").value.trim();
  }
  localStorage.setItem("userData", JSON.stringify(userData));
}

// ✅ تحميل بيانات المستخدم عند فتح الصفحة
function loadUserData() {
  const storedData = safeJSONParse(localStorage.getItem("userData"));
  if (storedData) {
    if (storedData.deliveryOption) {
      document.getElementById("deliveryOption").value = storedData.deliveryOption;
      if (storedData.deliveryOption === "delivery") {
        document.getElementById("deliveryFields").style.display = "block";
        document.getElementById("deliveryScheduleField").style.display = "block";
        document.getElementById("deliveryDate").value = storedData.deliveryDate || "";
        document.getElementById("deliveryTime").value = storedData.deliveryTime || "";
      } else if (storedData.deliveryOption === "pickup") {
        document.getElementById("pickupScheduleField").style.display = "block";
        document.getElementById("pickupDate").value = storedData.pickupDate || "";
        document.getElementById("pickupTime").value = storedData.pickupTime || "";
      }
    }
    document.getElementById("vorname").value = storedData.vorname || "";
    document.getElementById("nachname").value = storedData.nachname || "";
    document.getElementById("strasse").value = storedData.strasse || "";
    document.getElementById("hausnummer").value = storedData.hausnummer || "";
    document.getElementById("plz").value = storedData.plz || "";
    document.getElementById("stadt").value = storedData.stadt || "";
    document.getElementById("customerNotes").value = storedData.notes || "";
    document.getElementById("orderDetails").style.display = "block";
  }
}

// ✅ جلب أوقات الدوام من Firebase باستخدام async/await
async function loadWorkingHours() {
  try {
    const snapshot = await database.ref("workingHours").once("value");
    const data = snapshot.val();
    if (data) {
      localStorage.setItem("workingHours", JSON.stringify(data));
      updateWorkingHoursDisplay(data);
    }
  } catch (error) {
    console.error("Error loading working hours:", error);
    showFloatingMessage("Fehler beim Laden der Öffnungszeiten.", "red");
  }
}

// ✅ عرض أوقات الدوام in the Modal
function updateWorkingHoursDisplay(workingHours) {
  const container = document.getElementById("workingHoursDisplay");
  if (!container) return;
  container.innerHTML = "";
  const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dayAbbr = { Montag: "Mo", Dienstag: "Di", Mittwoch: "Mi", Donnerstag: "Do", Freitag: "Fr", Samstag: "Sa", Sonntag: "So" };

  dayNames.forEach((day) => {
    if (workingHours[day]) {
      const hours = workingHours[day];
      const segments = [];
      if (hours.closed) {
        segments.push("🚫");
      } else {
        if (hours.pickupStart && hours.pickupEnd && hours.pickupStart.trim() !== "" && hours.pickupEnd.trim() !== "") {
          segments.push(`Abholung: ${hours.pickupStart}–${hours.pickupEnd}`);
        }
        if (hours.deliveryStart && hours.deliveryEnd && hours.deliveryStart.trim() !== "" && hours.deliveryEnd.trim() !== "") {
          segments.push(`Lieferung: ${hours.deliveryStart}–${hours.deliveryEnd}`);
        }
      }
      if (segments.length > 0) {
        const entry = document.createElement("p");
        entry.innerHTML = `<strong>${dayAbbr[day]}:</strong> ${segments.join(" | ")}`;
        container.appendChild(entry);
      }
    }
  });
}

// ✅ دالة التحقق من أن الوقت المختار innerhalb der Arbeitszeiten
function isSelectedTimeWithinWorkingHours(selectedDateTime, type) {
  const workingHours = JSON.parse(localStorage.getItem("workingHours"));
  if (!workingHours) {
    console.warn("Keine gespeicherten Arbeitszeiten gefunden.");
    return false;
  }
  const daysOfWeek = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const selectedDay = daysOfWeek[selectedDateTime.getDay()];
  const todayHours = workingHours[selectedDay];
  if (!todayHours || todayHours.closed) {
    console.warn(`Der Laden ist am ${selectedDay} geschlossen.`);
    return false;
  }
  let start, end;
  if (type === "delivery") {
    start = todayHours.deliveryStart;
    end = todayHours.deliveryEnd;
  } else {
    start = todayHours.pickupStart;
    end = todayHours.pickupEnd;
  }
  if (!start || !end) {
    console.warn(`Keine ${type}-Zeiten für ${selectedDay} definiert.`);
    return false;
  }
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  const startTime = new Date(selectedDateTime);
  startTime.setHours(startHours, startMinutes, 0);
  const endTime = new Date(selectedDateTime);
  endTime.setHours(endHours, endMinutes, 0);
  return selectedDateTime >= startTime && selectedDateTime <= endTime;
}

// ✅ دالة التحقق من صحة موعد الطلب
function validateSchedule() {
  const deliveryOption = document.getElementById("deliveryOption").value;
  const now = new Date();

  if (deliveryOption === "delivery") {
    const deliveryDate = document.getElementById("deliveryDate").value;
    const deliveryTime = document.getElementById("deliveryTime").value;
    if (!deliveryDate || !deliveryTime) {
      showFloatingMessage("Bitte wählen Sie ein gültiges Lieferdatum und -zeit aus.", "red");
      return false;
    }
    const selectedDelivery = new Date(`${deliveryDate}T${deliveryTime}`);
    const minDelivery = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (selectedDelivery < minDelivery) {
      showFloatingMessage("Für die Lieferung muss die Bestellung mindestens 2 Stunden im Voraus erfolgen.", "red");
      return false;
    }
    if (!isSelectedTimeWithinWorkingHours(selectedDelivery, "delivery")) {
      showFloatingMessage("Die gewählte Lieferzeit liegt außerhalb der Öffnungszeiten.", "red");
      return false;
    }
  } else if (deliveryOption === "pickup") {
    const pickupDate = document.getElementById("pickupDate").value;
    const pickupTime = document.getElementById("pickupTime").value;
    if (!pickupDate || !pickupTime) {
      showFloatingMessage("Bitte wählen Sie ein gültiges Abholdatum und -zeit aus.", "red");
      return false;
    }
    const selectedPickup = new Date(`${pickupDate}T${pickupTime}`);
    const minPickup = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    if (selectedPickup < minPickup) {
      showFloatingMessage("Für die Selbstabholung muss die Bestellung mindestens 1 Stunde im Voraus erfolgen.", "red");
      return false;
    }
    if (!isSelectedTimeWithinWorkingHours(selectedPickup, "pickup")) {
      showFloatingMessage("Die gewählte Abholzeit liegt außerhalb der Öffnungszeiten.", "red");
      return false;
    }
  }
  return true;
}

// ✅ إرسال الطلب إلى WhatsApp مع معالجة رقم الهاتف (باستخدام async/await)
// تم تعديل الدالة لتجميع بيانات جميع الأصناف الموجودة في السلة
async function sendToWhatsApp() {
  if (!validateSchedule()) return;

  try {
    const snapshot = await database.ref("config/whatsappNumber").once("value");
    let rawNumber = snapshot.val() || "4915759100569";
    const whatsappNumber = rawNumber.replace(/\D/g, "");
    const orderNum = generateOrderNumber();
    const deliveryOption = document.getElementById("deliveryOption").value;
    const customerNotes = document.getElementById("customerNotes").value.trim();

    // تجميع بيانات الأصناف من السلة
    const cartItems = document.querySelectorAll("#cartList .cart-item");
    if (cartItems.length === 0) {
      showFloatingMessage("Bitte fügen Sie mindestens einen Artikel zum Warenkorb hinzu.", "red");
      return;
    }
    let dishesMessage = "";
    cartItems.forEach(cartItem => {
      const id = cartItem.getAttribute("data-item-id");
      const name = cartItem.querySelector(".cart-item-name").innerText;
      const quantity = cartItem.querySelector(".cart-quantity-value").innerText;
      dishesMessage += `🍛 *Gericht:* - ${id}. ${name} (Anzahl: ${quantity})\n\n`;
    });

    const welcomeMessage = "Hallo, ich möchte gerne bestellen:\n\n";
    let message = welcomeMessage;
    message += `📜 *Bestellnummer:* ${orderNum}\n\n`;
    message += dishesMessage;

    if (customerNotes) {
      message += `📝 *Dazu:* ${customerNotes}\n\n`;
    }

    if (deliveryOption === "delivery") {
      const vorname = document.getElementById("vorname").value.trim();
      const nachname = document.getElementById("nachname").value.trim();
      const strasse = document.getElementById("strasse").value.trim();
      const hausnummer = document.getElementById("hausnummer").value.trim();
      const plz = document.getElementById("plz").value.trim();
      const stadt = document.getElementById("stadt").value.trim();

      const addressQuery = encodeURIComponent(`${strasse} ${hausnummer}, ${plz} ${stadt}`);
      const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

      message +=
        `🚚 *Lieferung*\n` +
        `🏠 *Adresse:*\n${strasse} ${hausnummer}, ${plz} ${stadt}\n\n` +
        `📍 *Standort auf Google Maps:*\n${googleMapsURL}\n\n`;

      const deliveryDate = document.getElementById("deliveryDate").value.trim();
      const deliveryTime = document.getElementById("deliveryTime").value.trim();
      if (deliveryDate || deliveryTime) {
        message += `📅 *Lieferdatum:* ${deliveryDate}\n` +
                   `⏰ *Lieferzeit:* ${deliveryTime}\n\n`;
      }
    } else if (deliveryOption === "pickup") {
      const pickupDate = document.getElementById("pickupDate").value.trim();
      const pickupTime = document.getElementById("pickupTime").value.trim();
      if (pickupDate || pickupTime) {
        message += `🚶 *Selbstabholung*\n` +
                   `📅 *Abholdatum:* ${pickupDate}\n` +
                   `⏰ *Abholzeit:* ${pickupTime}\n\n`;
      }
    }

    // ✅ إنشاء رابط واتساب وإرساله
    const whatsappURLFinal = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURLFinal, "_blank");
  } catch (error) {
    console.error("Error sending to WhatsApp:", error);
    showFloatingMessage("Fehler beim Senden der Bestellung.", "red");
  }
}

// ✅ عرض رسالة عائمة للمستخدم
function showFloatingMessage(text, color = "red") {
  const popup = document.createElement("div");
  popup.classList.add("popup", "show");
  popup.style.backgroundColor = color;
  popup.innerText = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

// ✅ تعبئة الحقول تلقائيًا عند إدخال الاسم الأول
document.getElementById("vorname").addEventListener("input", function () {
  const name = this.value.trim().toLowerCase();
  if (name in userDataStore) {
    const data = userDataStore[name];
    document.getElementById("nachname").value = data.nachname;
    document.getElementById("strasse").value = data.strasse;
    document.getElementById("hausnummer").value = data.hausnummer;
    document.getElementById("plz").value = data.plz;
    document.getElementById("stadt").value = data.stadt;
  }
});

// ✅ عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  await fetchItems();
  loadUserData();
  await loadWorkingHours();

  const preLoginModal = document.getElementById("preLoginModal");
  if (preLoginModal) {
    preLoginModal.style.display = "flex";
    const continueBtn = document.getElementById("continueBtn");
    if (continueBtn) {
      continueBtn.addEventListener("click", function () {
        preLoginModal.style.display = "none";
      });
    }
  }
});

// Neuer Code: Funktionen zur Mengensteuerung und Bestellung für den Warenkorb

function increaseCartQuantity(button) {
  const qtySpan = button.parentElement.querySelector(".cart-quantity-value");
  let qty = parseInt(qtySpan.innerText);
  qtySpan.innerText = qty + 1;
}

function decreaseCartQuantity(button) {
  const qtySpan = button.parentElement.querySelector(".cart-quantity-value");
  let qty = parseInt(qtySpan.innerText);
  if (qty > 1) {
    qtySpan.innerText = qty - 1;
  }
}

function removeCartItem(button) {
  const li = button.parentElement;
  li.remove();
  const cartList = document.getElementById("cartList");
  if (cartList.children.length === 0) {
    document.getElementById("cartContainer").style.display = "none";
  }
}
