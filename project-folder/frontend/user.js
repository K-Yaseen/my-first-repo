// ================================================
// I. Firebase Initialisierung / تهيئة فايربيس
// (تأكد من تحميل مكتبات Firebase في HTML قبل هذا الملف)
// ================================================
let currentItem = null;

const firebaseConfig = {
  apiKey: "AIzaSyBeAkTPw9nswsCy9NtWEgf6nG4al5Qx83c",
  authDomain: "restaurant-system-f50cf.firebaseapp.com",
  databaseURL: "https://restaurant-system-f50cf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "restaurant-system-f50cf",
  storageBucket: "restaurant-system-f50cf.firebasestorage.app",
  messagingSenderId: "220436037433",
  appId: "1:220436037433:web:9bfc0f85a8806a15ee72e8"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ================================================
// II. Utility Functions / وظائف مساعدة
// ================================================
let items = [];
const userDataStore = {};

function safeJSONParse(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    return null;
  }
}

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

// ================================================
// III. Differences and Modal Functions / اختلافات ومودال التعديلات
// ================================================
function getDifferences(oldItem, newItem) {
  if (!oldItem || !newItem) return [];
  const diffs = [];
  if (oldItem.name !== newItem.name) {
    diffs.push(`Name: "${oldItem.name}" → "${newItem.name}"`);
  }
  if (oldItem.ingredients !== newItem.ingredients) {
    const oldIng = oldItem.ingredients || "N/A";
    const newIng = newItem.ingredients || "N/A";
    diffs.push(`Zutaten: "${oldIng}" → "${newIng}"`);
  }
  if (oldItem.price !== newItem.price) {
    const oldPrice = oldItem.price != null ? oldItem.price : "N/A";
    const newPrice = newItem.price != null ? newItem.price : "N/A";
    diffs.push(`Preis: ${oldPrice} € → ${newPrice} €`);
  }
  if (oldItem.available !== newItem.available) {
    const oldAvail = oldItem.available ? "Verfügbar" : "Nicht verfügbar";
    const newAvail = newItem.available ? "Verfügbar" : "Nicht verfügbar";
    diffs.push(`Verfügbarkeit: ${oldAvail} → ${newAvail}`);
  }
  if (oldItem.category !== newItem.category) {
    const oldCat = oldItem.category || "N/A";
    const newCat = newItem.category || "N/A";
    diffs.push(`Kategorie: "${oldCat}" → "${newCat}"`);
  }
  return diffs;
}

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

// ================================================
// IV. Firebase and Data Functions / وظائف فايربيس والبيانات
// ================================================
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

function storeBaselineIfFirstPanel(item) {
  if (!item || item.id == null) return;
  const storageKey = "initialItem_" + item.id;
  if (!localStorage.getItem(storageKey)) {
    if (item.lastUpdateSource === "firstPanel") {
      localStorage.setItem(storageKey, JSON.stringify(item));
    }
  }
}

// ================================================
// V. Order and UI Functions / وظائف الطلب وواجهة المستخدم
// ================================================
function checkItem() {
  const itemNumberInput = document.getElementById("itemNumber");
  const itemNumber = itemNumberInput ? itemNumberInput.value.trim() : "";
  const result = document.getElementById("result");
  const orderDetails = document.getElementById("orderDetails");
  const addToCartBtn = document.getElementById("addToCartBtn");

  // إعادة إظهار قسم النتيجة عند البحث مجددًا
  result.style.display = "block";
  // في البداية يتم إخفاء زر الإضافة حتى يتم التأكد من وجود صنف متاح
  addToCartBtn.style.display = "none";

  if (!itemNumber) {
    result.innerHTML = `
      <div class="item-card not-available">
        <p>Bitte geben Sie eine Gerichtsnummer ein.</p>
      </div>`;
    orderDetails.style.display = "none";
    hideFloatingCart();
    addToCartBtn.style.display = "none";
    return;
  }

  const item = items.find(i => i.id == itemNumber);
  if (item) {
    const availabilityText = item.available ? "Verfügbar" : "Nicht verfügbar";
    const availabilityClass = item.available ? "available" : "not-available";
    const priceText = item.price ? (item.price.toFixed(2) + " €") : "Preis nicht verfügbar";
    const ingredientsText = item.ingredients || "Keine Zutatenangaben";

    result.innerHTML = `
      <div class="item-card ${availabilityClass}">
        <h2 class="item-title">Gericht ${item.id}: ${item.name}</h2>
        <p class="item-ingredients">Zutaten: ${ingredientsText}</p>
        <p class="item-availability">Status: <strong>${availabilityText}</strong></p>
        <p class="item-price">Preis: <strong>${priceText}</strong></p>
      </div>`;

    if (item.available) {
      orderDetails.style.display = "block";
      document.getElementById("whatsappBtn").setAttribute("data-item-id", item.id);
      document.getElementById("whatsappBtn").setAttribute("data-item-name", item.name);
      currentItem = item;
      // إعادة إظهار زر الإضافة عند إيجاد صنف متاح
      addToCartBtn.style.display = "block";
    } else {
      orderDetails.style.display = "none";
      hideFloatingCart();
      addToCartBtn.style.display = "none";
    }
  } else {
    result.innerHTML = `
      <div class="item-card not-available">
        <p>⚠️ Gerichtsnummer nicht gefunden.</p>
      </div>`;
    orderDetails.style.display = "none";
    hideFloatingCart();
    addToCartBtn.style.display = "none";
  }
}



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

// ================================================
// VI. Working Hours Functions / وظائف أوقات الدوام
// ================================================
function updateTimeConstraints() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const pickupDateInput = document.getElementById('pickupDate');
  const pickupTimeInput = document.getElementById('pickupTime');
  if (pickupDateInput && pickupTimeInput) {
    if (pickupDateInput.value === todayStr) {
      let minPickupTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      let hours = String(minPickupTime.getHours()).padStart(2, '0');
      let minutes = String(minPickupTime.getMinutes()).padStart(2, '0');
      pickupTimeInput.min = `${hours}:${minutes}`;
    } else {
      pickupTimeInput.min = "00:00";
    }
  }

  const deliveryDateInput = document.getElementById('deliveryDate');
  const deliveryTimeInput = document.getElementById('deliveryTime');
  if (deliveryDateInput && deliveryTimeInput) {
    if (deliveryDateInput.value === todayStr) {
      let minDeliveryTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      let hours = String(minDeliveryTime.getHours()).padStart(2, '0');
      let minutes = String(minDeliveryTime.getMinutes()).padStart(2, '0');
      deliveryTimeInput.min = `${hours}:${minutes}`;
    } else {
      deliveryTimeInput.min = "00:00";
    }
  }
}

function loadWorkingHours() {
  return new Promise(async (resolve) => {
    try {
      const snapshot = await database.ref("workingHours").once("value");
      const data = snapshot.val();
      if (data) {
        localStorage.setItem("workingHours", JSON.stringify(data));
        updateWorkingHoursDisplay(data);
      }
      resolve();
    } catch (error) {
      console.error("Error loading working hours:", error);
      showFloatingMessage("Fehler beim Laden der Öffnungszeiten.", "red");
      resolve();
    }
  });
}

function updateWorkingHoursDisplay(workingHours, serviceOption = "beides") {
  const container = document.getElementById("workingHoursDisplay");
  if (!container) return;
  container.innerHTML = "";

  const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dayAbbr = {
    Montag: "Mo", Dienstag: "Di", Mittwoch: "Mi",
    Donnerstag: "Do", Freitag: "Fr", Samstag: "Sa", Sonntag: "So"
  };

  dayNames.forEach((day) => {
    if (workingHours[day]) {
      const hours = workingHours[day];
      const segments = [];

      // إذا اليوم مغلق
      if (hours.closed) {
        segments.push("🚫");
      } else {
        // اعرض أوقات الاستلام (Pickup) إذا لم يكن serviceOption = nurLieferung
        if (serviceOption !== "nurLieferung" && hours.pickupStart && hours.pickupEnd) {
          segments.push(`Abholung: ${hours.pickupStart}–${hours.pickupEnd}`);
        }
        // اعرض أوقات التوصيل (Delivery) إذا لم يكن serviceOption = nurAbholung
        if (serviceOption !== "nurAbholung" && hours.deliveryStart && hours.deliveryEnd) {
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

function showFloatingMessage(message, color = "red") {
  // يمكنك عرض الرسالة كـalert مثلاً:
  alert(message);

  // أو لو لديك عنصر popupMessage وتريد إظهاره مؤقتًا:
  /*
  const popup = document.getElementById("popupMessage");
  if (!popup) return;
  popup.style.color = color;
  popup.textContent = message;
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, 3000);
  */
}

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

// ================================================
// VII. WhatsApp Order Functions / Funktionen für WhatsApp-Bestellung
// ================================================
// دالة التحقق من صحة الحقول المطلوبة für Lieferung
function validateDeliveryFields() {
  const deliveryOption = document.getElementById("deliveryOption").value;
  // إذا كان خيار "Lieferung" محددًا، يتم التحقق من تعبئة الحقول المطلوبة
  if (deliveryOption === "delivery") {
    const vorname = document.getElementById("vorname").value.trim();
    const nachname = document.getElementById("nachname").value.trim();
    const strasse = document.getElementById("strasse").value.trim();
    const hausnummer = document.getElementById("hausnummer").value.trim();
    const plz = document.getElementById("plz").value.trim();
    const stadt = document.getElementById("stadt").value.trim();

    if (!vorname || !nachname || !strasse || !hausnummer || !plz || !stadt) {
      showFloatingMessage("Bitte füllen Sie alle erforderlichen Felder für die Lieferung aus.", "red");
      return false;
    }
  }
  return true;
}

async function sendToWhatsApp() {
  // أولاً: التحقق من أن هناك عناصر في السلة
  const cartItemsElement = document.getElementById("cartItems");
  if (!cartItemsElement || cartItemsElement.children.length === 0) {
    alert("Bitte fügen Sie mindestens ein Gericht in den Warenkorb hinzu, bevor Sie bestellen.");
    return; // إيقاف التنفيذ إذا كانت السلة فارغة
  }

  const deliveryOption = document.getElementById("deliveryOption").value;

  // التحقق من صحة الحقول المطلوبة إذا كانت Lieferung
  if (deliveryOption === "delivery" && !validateDeliveryFields()) return;
  // التحقق من صحة الموعد المختار (سواء للتوصيل أو للاستلام)
  if (!validateSchedule()) return;

  try {
    const snapshot = await database.ref("config/whatsappNumber").once("value");
    let rawNumber = snapshot.val() || "4915759100569";
    const whatsappNumber = rawNumber.replace(/\D/g, "");

    const orderNum = generateOrderNumber();
    let message = "Hallo, ich möchte gerne bestellen:\n\n";
    message += `📜 *Bestellnummer:* ${orderNum}\n\n`;

    // إضافة ملاحظات العميل إن وجدت
    const customerNotes = document.getElementById("customerNotes").value.trim();
    if (customerNotes) {
      message += `📝 *Dazu:* ${customerNotes}\n\n`;
    }

    // إضافة محتوى السلة
    if (cartItemsElement && cartItemsElement.children.length > 0) {
      message += "🛒 *Warenkorb-Inhalt:*\n";
      cartItemsElement.querySelectorAll(".cart-item").forEach(cartItem => {
        const itemInfoEl = cartItem.querySelector(".item-info");
        const quantitySelectEl = cartItem.querySelector(".quantity-dropdown");
        const itemText = itemInfoEl ? itemInfoEl.textContent.trim() : "Unbekanntes Item";
        const quantity = quantitySelectEl ? quantitySelectEl.value : "1";
        message += `${itemText} Menge: ${quantity}\n`;
      });
      message += "\n";
    }

    // إضافة اسم المستخدم
    const vorname = document.getElementById("vorname").value.trim();
    const nachname = document.getElementById("nachname").value.trim();
    if (vorname || nachname) {
      message += `👤 *Name:* ${vorname} ${nachname}\n\n`;
    }

    // إعداد معلومات التوصيل أو الاستلام
    if (deliveryOption === "delivery") {
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
        message += `📅 *Lieferdatum:* ${deliveryDate}\n`
          + `⏰ *Lieferzeit:* ${deliveryTime}\n\n`;
      }
    } else if (deliveryOption === "pickup") {
      const pickupDate = document.getElementById("pickupDate").value.trim();
      const pickupTime = document.getElementById("pickupTime").value.trim();
      message +=
        `🚶 *Selbstabholung*\n`
        + `📅 *Abholdatum:* ${pickupDate}\n`
        + `⏰ *Abholzeit:* ${pickupTime}\n\n`;
    }

    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");

    clearCart(); // مسح السلة بعد إرسال الطلب
  } catch (error) {
    console.error("Error sending to WhatsApp:", error);
    showFloatingMessage("Fehler beim Senden der Bestellung.", "red");
  }
}


// احتفظ بالدالة الأصلية
const _originalSendToWhatsApp = window.sendToWhatsApp;

// استبدل الدالة بواحدة جديدة
window.sendToWhatsApp = function () {
  // استدعِ المودال قبل الإرسال
  showPaymentConfirm(() => {
    // إذا وافق المستخدم، نستدعي الدالة الأصلية فعليًا
    _originalSendToWhatsApp();
  });
};



// ================================================
// VIII. Floating Cart Functions / وظائف للسلة العائمة
// ================================================
function hideFloatingCart() {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

function showSavePopup() {
  // حفظ بيانات المستخدم:
  saveUserData();

  // ثم عرض رسالة منبثقة:
  const popup = document.getElementById("popupMessage");
  if (popup) {
    popup.classList.add("show");
    setTimeout(() => {
      popup.classList.remove("show");
    }, 3000);
  }
}


// هذه الدالة لاستدعائها عند الضغط على زر "Weitere Bestellung hinzufügen"
function redirectToSearchField() {
  const searchField = document.getElementById("itemNumber");
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none"; // إخفاء الحاوية العائمة
  }
  // if (searchField) {
  //   searchField.focus();
  //   window.scrollTo({ top: searchField.offsetTop, behavior: 'smooth' });
  // }
}

// زر اضافة صنف واحد إلى السلة
function addToCart() {
  if (currentItem) {
    updateFloatingCart(currentItem);
    // إخفاء القسم الذي يظهر توافر الصنف
    const resultSection = document.getElementById("result");
    if (resultSection) {
      resultSection.style.display = "none";
    }
    // إخفاء زر إضافة الصنف إلى السلة
    const addToCartBtn = document.getElementById("addToCartBtn");
    if (addToCartBtn) {
      addToCartBtn.style.display = "none";
    }
  } else {
    alert("Es gibt keinen bestimmten Artikel zum Hinzufügen zum Warenkorb.");
  }
}


function updateFloatingCart(item, quantity = 1, showOverlay = true) {
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");
  if (!overlay || !cartItems) return;

  // التحقق إذا كان الصنف موجودًا مسبقًا في السلة
  const existingItem = cartItems.querySelector(`li[data-item-id="${item.id}"]`);
  if (existingItem) {
    const quantitySelect = existingItem.querySelector(".quantity-dropdown");
    // إذا كانت الكمية المحملة أكبر من 1 (أي عند الاسترجاع من localStorage) يتم تعيينها مباشرة
    if (quantity > 1) {
      quantitySelect.value = quantity;
    } else {
      // إذا ضاف المستخدم نفس الصنف مرة أخرى، فلتزداد الكمية بمقدار 1
      let currentQuantity = parseInt(quantitySelect.value, 10);
      if (currentQuantity < 50) {
        currentQuantity++;
        quantitySelect.value = currentQuantity;
      }
    }
    // إظهار الحاوية العائمة فقط إذا طلبنا ذلك عبر showOverlay
    if (showOverlay) {
      overlay.style.display = "flex";
    }
    updateCartButton();
    saveCart();
    return;
  }

  // ـــــــــــــــــــــــــــــــــــــــــــ
  // ⚠️ احذف/علّق أي سطر يشبه:
  // updateFloatingCart(item, cartItem.quantity, false);
  // لأنه يسبب استدعاء الدالة بمتغير غير معرّف ويخلق مشاكل
  // ـــــــــــــــــــــــــــــــــــــــــــ

  // إنشاء عنصر li جديد وإضافته إلى قائمة السلة
  const li = document.createElement("li");
  li.className = "cart-item";
  li.setAttribute("data-item-id", item.id);

  // عرض معلومات الصنف
  const itemInfo = document.createElement("span");
  itemInfo.className = "item-info";
  itemInfo.textContent = `- ${item.id}. ${item.name}`;

  // إنشاء قائمة dropdown لتحديد الكمية
  const quantitySelect = document.createElement("select");
  quantitySelect.className = "quantity-dropdown";
  for (let i = 1; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    quantitySelect.appendChild(option);
  }
  // تعيين الكمية المحددة (عند الإضافة أو الاسترجاع)
  quantitySelect.value = quantity;

  // إنشاء زر حذف الصنف من السلة
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0L284.2 0c12.1 0 23.2 6.8 28.6 17.7L320 32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0 7.2-14.3zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-320zm96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16z"/></svg>
`;
  deleteBtn.title = "Gericht Löschen";
  deleteBtn.addEventListener("click", function () {
    if (confirm("Möchten Sie diesen Artikel wirklich aus dem Warenkorb entfernen?")) {
      li.remove();
      updateCartButton();
      saveCart();
    }
  });

  // ربط العناصر ببعضها
  li.appendChild(itemInfo);
  li.appendChild(quantitySelect);
  li.appendChild(deleteBtn);
  cartItems.appendChild(li);

  // إظهار الحاوية العائمة فقط إذا كان مطلوبًا
  if (showOverlay) {
    overlay.style.display = "flex";
  }

  updateCartButton();
  saveCart();
}






// ================================================
// X. Event Listeners / مستمعي الأحداث
// ================================================
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

document.addEventListener("DOMContentLoaded", async () => {
  await fetchItems();
  loadUserData();
  await loadWorkingHours(); // سيضع workingHours في localStorage
  loadCart(); // استرجاع بيانات السلة من localStorage

  // 1) اجلب خيار الخدمة من Firebase
  const snapshot = await firebase.database().ref("config/serviceOption").once("value");
  const serviceOption = snapshot.val() || "beides";

  // 2) استدعِ الدالة updateWorkingHoursDisplay مع تمرير خيار الخدمة
  const storedWorkingHours = JSON.parse(localStorage.getItem("workingHours"));
  if (storedWorkingHours) {
    updateWorkingHoursDisplay(storedWorkingHours, serviceOption);
  }

  // إظهار مودال أوقات الدوام عند الفتح
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

  // تحديث قيود التوقيت
  updateTimeConstraints();

  // الحصول على العنصر <select> الخاص بالـdeliveryOption
  const deliverySelect = document.getElementById("deliveryOption");
  if (deliverySelect) {
    deliverySelect.addEventListener("change", function () {
      const selected = this.value;
      if (selected === "pickup") {
        // إظهار حقول الاستلام
        document.getElementById("pickupScheduleField").style.display = "block";
        // إخفاء حقول التوصيل
        document.getElementById("deliveryScheduleField").style.display = "none";
        document.getElementById("deliveryFields").style.display = "none";
      } else if (selected === "delivery") {
        // إظهار حقول التوصيل
        document.getElementById("deliveryScheduleField").style.display = "block";
        document.getElementById("deliveryFields").style.display = "block";
        // إخفاء حقول الاستلام
        document.getElementById("pickupScheduleField").style.display = "none";
      }
    });
  }
});


function saveUserData() {
  // 1) اجمع بيانات المستخدم من الحقول
  const deliveryOption = document.getElementById("deliveryOption").value;
  const vorname = document.getElementById("vorname").value.trim();
  const nachname = document.getElementById("nachname").value.trim();
  const strasse = document.getElementById("strasse").value.trim();
  const hausnummer = document.getElementById("hausnummer").value.trim();
  const plz = document.getElementById("plz").value.trim();
  const stadt = document.getElementById("stadt").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

  // إذا كان خيار الاستلام:
  let pickupDate = "";
  let pickupTime = "";
  let deliveryDate = "";
  let deliveryTime = "";

  if (deliveryOption === "pickup") {
    pickupDate = document.getElementById("pickupDate").value;
    pickupTime = document.getElementById("pickupTime").value;
  } else if (deliveryOption === "delivery") {
    deliveryDate = document.getElementById("deliveryDate").value;
    deliveryTime = document.getElementById("deliveryTime").value;
  }

  // 2) أنشئ كائن يتضمن كل البيانات:
  const userData = {
    deliveryOption,
    vorname,
    nachname,
    strasse,
    hausnummer,
    plz,
    stadt,
    notes,
    pickupDate,
    pickupTime,
    deliveryDate,
    deliveryTime
  };

  // 3) خزّن هذا الكائن في localStorage
  localStorage.setItem("userData", JSON.stringify(userData));
}

// دالة لتحديث عرض الزر وعدد العناصر بالسلة
function updateCartButton() {
  const cartItems = document.getElementById("cartItems");
  const backToCartBtn = document.getElementById("backToCartBtn");
  const overlay = document.getElementById("floatingCartOverlay");
  if (!cartItems || !backToCartBtn) return;

  // حساب مجموع الكميات لجميع العناصر
  let totalQuantity = 0;
  const items = cartItems.getElementsByTagName("li");
  for (let i = 0; i < items.length; i++) {
    const quantitySelect = items[i].querySelector(".quantity-dropdown");
    totalQuantity += parseInt(quantitySelect.value, 10);
  }

  if (totalQuantity > 0) {
    backToCartBtn.style.display = "flex";
    backToCartBtn.querySelector(".item-count").textContent = totalQuantity;
  } else {
    backToCartBtn.style.display = "none";
    if (overlay) {
      overlay.style.display = "none";
    }
  }
}

function saveCart() {
  const cartItemsContainer = document.getElementById("cartItems");
  const cartItemsArray = [];
  cartItemsContainer.querySelectorAll(".cart-item").forEach(item => {
    const itemId = item.getAttribute("data-item-id");
    const quantity = item.querySelector(".quantity-dropdown").value;
    cartItemsArray.push({ id: itemId, quantity: quantity });
  });
  localStorage.setItem("cart", JSON.stringify(cartItemsArray));
}

function loadCart() {
  const cartData = localStorage.getItem("cart");
  if (!cartData) return;
  try {
    const cartItemsArray = JSON.parse(cartData);
    const cartItemsContainer = document.getElementById("cartItems");
    cartItemsContainer.innerHTML = "";
    cartItemsArray.forEach(cartItem => {
      // ابحث عن تفاصيل الصنف في المصفوفة العالمية items
      const item = items.find(i => i.id == cartItem.id);
      if (item) {
        // هنا يمكنك استدعاء الدالة مع تحديد الكمية وعدم إظهار الحاوية مباشرةً
        updateFloatingCart(item, cartItem.quantity, false);
      }
    });
  } catch (error) {
    console.error("Error loading cart:", error);
  }
}


function clearCart() {
  localStorage.removeItem("cart");
  const cartItemsContainer = document.getElementById("cartItems");
  if (cartItemsContainer) cartItemsContainer.innerHTML = "";
  updateCartButton();
}

// عند النقر على زر العودة إلى السلة، يتم عرض الحاوية العائمة
document.getElementById("backToCartBtn").addEventListener("click", function () {
  document.getElementById("floatingCartOverlay").style.display = "flex";
});

// يمكنك أيضاً استدعاء updateCartButton() عند تحميل الصفحة للتأكد من تحديثه
document.addEventListener("DOMContentLoaded", function () {
  updateCartButton();
});


// الاستماع لتحديثات إعداد الخدمة من Firebase وتطبيقها على واجهة المستخدم
firebase.database().ref("config/serviceOption").on("value", function (snapshot) {
  const option = snapshot.val() || "beides";
  applyUserServiceOption(option);
});

// دالة لتطبيق إعداد الخدمة على واجهة المستخدم
function applyUserServiceOption(option) {
  const deliveryOptionSelect = document.getElementById("deliveryOption");
  if (option === "nurLieferung") {
    deliveryOptionSelect.innerHTML = '<option value="delivery">Lieferung</option>';
    document.getElementById("pickupScheduleField").style.display = "none";
    document.getElementById("deliveryScheduleField").style.display = "block";
    document.getElementById("deliveryFields").style.display = "block";
    deliveryOptionSelect.style.display = "none";

    // استهداف الفقرة بدون الحاجة لصنف "hinweis"
    const deliveryHint = document.querySelector("#deliveryFields p");
    if (deliveryHint) {
      deliveryHint.style.display = "none";
    }
  } else if (option === "nurAbholung") {
    deliveryOptionSelect.innerHTML = '<option value="pickup">Selbstabholung</option>';
    document.getElementById("deliveryScheduleField").style.display = "none";
    document.getElementById("deliveryFields").style.display = "none";
    document.getElementById("pickupScheduleField").style.display = "block";
    deliveryOptionSelect.style.display = "none";
  } else {
    deliveryOptionSelect.innerHTML =
      '<option value="pickup">Selbstabholung</option>' +
      '<option value="delivery">Lieferung</option>';
    deliveryOptionSelect.style.display = "block";
    var deliveryNote = document.querySelector("#deliveryFields p");
    if (deliveryNote) {
      deliveryNote.style.display = "block";
    }
  }
}

function goToOrderDetails() {
  // إخفاء حاوية السلة العائمة
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }

  // إظهار قسم "orderDetails" في حال كان مخفياً
  const orderDetails = document.getElementById("orderDetails");
  if (orderDetails) {
    orderDetails.style.display = "block";

    // التمرير الانسيابي إلى القسم
    orderDetails.scrollIntoView({ behavior: 'smooth' });

    // إضافة تأثير الإبراز (Highlight) عبر كلاس CSS
    orderDetails.classList.add('highlight-section');

    // إزالة الكلاس بعد 4 ثوانٍ
    setTimeout(() => {
      orderDetails.classList.remove('highlight-section');
    }, 4000);
  }
}

function showPaymentConfirm(onConfirm) {
  // إنشاء مودال رئيسي
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex'; // اجعل المودال مرئيًا

  // إنشاء المحتوى الداخلي للمودال
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '450px';
  modalContent.style.textAlign = 'center';

  // عنوان المودال
  const title = document.createElement('h2');
  title.innerText = 'Hinweis';

  // الرسالة التي كانت في الفقرة (يمكنك تخصيص نصها كما تحب)
  const paragraph = document.createElement('p');
  paragraph.innerText = 'Die Bezahlung erfolgt erst bei Erhalt der Bestellung. Sind Sie damit einverstanden?';
  paragraph.style.margin = '15px 0';
  paragraph.style.fontSize = '16px';

  // زر التأكيد
  const confirmBtn = document.createElement('button');
  confirmBtn.innerText = 'Ja, fortfahren';
  confirmBtn.style.margin = '10px';
  confirmBtn.style.backgroundColor = '#28a745';
  confirmBtn.style.color = '#fff';
  confirmBtn.style.border = 'none';
  confirmBtn.style.padding = '10px 20px';
  confirmBtn.style.borderRadius = '5px';
  confirmBtn.style.cursor = 'pointer';

  // زر الإلغاء
  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = 'Abbrechen';
  cancelBtn.style.margin = '10px';
  cancelBtn.style.backgroundColor = '#dc3545';
  cancelBtn.style.color = '#fff';
  cancelBtn.style.border = 'none';
  cancelBtn.style.padding = '10px 20px';
  cancelBtn.style.borderRadius = '5px';
  cancelBtn.style.cursor = 'pointer';

  // إضافة العناصر للمحتوى
  modalContent.appendChild(title);
  modalContent.appendChild(paragraph);
  modalContent.appendChild(confirmBtn);
  modalContent.appendChild(cancelBtn);

  // إضافة المحتوى لعنصر المودال الرئيسي
  modal.appendChild(modalContent);

  // إضافة المودال إلى DOM
  document.body.appendChild(modal);

  // حدث الضغط على زر التأكيد
  confirmBtn.onclick = () => {
    // إزالة المودال
    document.body.removeChild(modal);
    // استدعاء الدالة المطلوبة (onConfirm)
    if (onConfirm) onConfirm();
  };

  // حدث الضغط على زر الإلغاء
  cancelBtn.onclick = () => {
    document.body.removeChild(modal);
  };
}


