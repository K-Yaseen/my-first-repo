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
  if (oldItem.price !== newItem.price) {
    const oldPrice = oldItem.price != null ? oldItem.price : "N/A";
    const newPrice = newItem.price != null ? newItem.price : "N/A";
    diffs.push(`Preis: ${oldPrice} € → ${newPrice} €`);
  }
  if (oldItem.ingredients !== newItem.ingredients) {
    const oldIng = oldItem.ingredients || "N/A";
    const newIng = newItem.ingredients || "N/A";
    diffs.push(`Zutaten: "${oldIng}" → "${newIng}"`);
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

  if (!itemNumber) {
    result.innerText = "Bitte geben Sie eine Artikelnummer ein.";
    result.style.color = "red";
    orderDetails.style.display = "none";
    hideFloatingCart();
    addToCartBtn.style.display = "none";
    return;
  }

  const item = items.find(i => i.id == itemNumber);
  if (item) {
    result.innerText = `✅ Gericht ${item.id} (${item.name}) ist ${item.available ? "Verfügbar" : "Nicht verfügbar"}.
Preis: ${item.price ? item.price.toFixed(2) + " €" : "Preis nicht verfügbar"}.
Zutaten: ${item.ingredients || "Keine Angaben"}.`;
    result.style.color = item.available ? "green" : "red";

    if (item.available) {
      orderDetails.style.display = "block";
      document.getElementById("whatsappBtn").setAttribute("data-item-id", item.id);
      document.getElementById("whatsappBtn").setAttribute("data-item-name", item.name);
      currentItem = item;  // تخزين الصنف الحالي
      addToCartBtn.style.display = "block";  // إظهار زر النقل إلى السلة
    } else {
      orderDetails.style.display = "none";
      hideFloatingCart();
      addToCartBtn.style.display = "none";
    }
  } else {
    result.innerText = "⚠️ Artikelnummer nicht gefunden.";
    result.style.color = "gray";
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

function updateWorkingHoursDisplay(workingHours) {
  const container = document.getElementById("workingHoursDisplay");
  if (!container) return;
  container.innerHTML = "";
  const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dayAbbr = { Montag: "Mo", Dienstag: "Di", Mittwoch: "Mi", Donnerstag: "Do", Freitag: "Fr", Samstag: "Sa", Sonntag: "So" };
  dayNames.forEach(day => {
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
// VII. WhatsApp Order Functions - الإصلاحات
async function sendToWhatsApp() {
  if (!currentItem) { // تحقق من وجود عنصر محدد
    showFloatingMessage("Bitte wählen Sie zuerst ein Gericht aus.", "red");
    return;
  }
  
  if (!validateSchedule()) return;

  try {
    const snapshot = await database.ref("config/whatsappNumber").once("value");
    let rawNumber = snapshot.val() || "4915759100569";
    const whatsappNumber = rawNumber.replace(/\D/g, "");
    const orderNum = generateOrderNumber();
    const deliveryOption = document.getElementById("deliveryOption").value;
    const customerNotes = document.getElementById("customerNotes").value.trim();
    
    // استخدام currentItem مباشرةً
    const itemName = currentItem.name;
    const ingredients = currentItem.ingredients || "Keine Angaben";
    const price = currentItem.price ? currentItem.price.toFixed(2) + " €" : "Preis nicht verfügbar";

    let message = `Hallo, ich möchte gerne bestellen:\n\n` +
      `📜 *Bestellnummer:* ${orderNum}\n\n` +
      `🍛 *Gericht:* - ${currentItem.id}. ${itemName}\n\n` +
      `🧂 *Zutaten:* ${ingredients}\n\n` +
      `💰 *Preis:* ${price}\n\n`;

    if (customerNotes) message += `📝 *Dazu:* ${customerNotes}\n\n`;

    // إضافة محتوى السلة
    const cartItems = document.querySelectorAll("#cartItems .item-info");
    if (cartItems.length > 0) {
      message += "🛒 *Warenkorb-Inhalt:*\n";
      cartItems.forEach(item => {
        message += `- ${item.textContent}\n`;
      });
      message += "\n";
    }

    // التحقق من تفاصيل التسليم/الاستلام
    let hasSchedule = false;
    if (deliveryOption === "delivery") {
      const deliveryDate = document.getElementById("deliveryDate").value;
      const deliveryTime = document.getElementById("deliveryTime").value;
      if (!deliveryDate || !deliveryTime) {
        showFloatingMessage("Bitte Lieferzeit auswählen.", "red");
        return;
      }
      // ... (بقية التفاصيل)
    }

    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");
    
  } catch (error) {
    console.error("Fehler:", error);
    showFloatingMessage("Fehler beim Senden.", "red");
  }
}




// ================================================
// VIII. Floating Cart Functions / Funktionen für den schwebenden Warenkorb
// ================================================
function updateFloatingCart(item) {
  // الحصول على عناصر ال DOM الخاصة بالحاوية وسلة المشتريات
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");

  // التأكد من وجود العناصر قبل المتابعة
  if (!overlay || !cartItems) return;

  // إنشاء عنصر قائمة جديد لعرض الصنف المضاف
  const li = document.createElement("li");
  li.textContent = `- ${item.id}. ${item.name}`;

  // إضافة العنصر الجديد إلى سلة المشتريات
  cartItems.appendChild(li);

  // عرض الحاوية إذا لم تكن معروضة
  overlay.style.display = "flex";
}


// ================================================
// IX. Event Listeners / مستمعي الأحداث
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
  await loadWorkingHours();

  // Modal für Öffnungszeiten anzeigen / عرض مودال أوقات الدوام
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

  // Zeitliche Einschränkungen aktualisieren / تحديث قيود الوقت عند تحميل الصفحة
  updateTimeConstraints();
});

// ================================================
// IX. Navigation Functions / نقل المستخدم مرة اخرى لخانة البحث
// ================================================
function redirectToSearchField() {
  const searchField = document.getElementById("itemNumber");
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none"; // إخفاء الحاوية عند النقر
  }
  if (searchField) {
    searchField.focus();
    window.scrollTo({ top: searchField.offsetTop, behavior: 'smooth' });
  }
}

// ================================================
// IX. Navigation Functions / زراضافة الى السلة
// ================================================
function addToCart() {
  if (currentItem) {
    updateFloatingCart(currentItem);
  } else {
    alert("Es gibt keinen bestimmten Artikel zum Hinzufügen zum Warenkorb.");
  }
}

function updateFloatingCart(item) {
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");
  if (!overlay || !cartItems) return;

  // إنشاء عنصر li جديد
  const li = document.createElement("li");
  li.className = "cart-item";

  // إنشاء عنصر عرض معلومات الصنف
  const itemInfo = document.createElement("span");
  itemInfo.className = "item-info";
  itemInfo.textContent = `- ${item.id}. ${item.name}`;

  // إنشاء Dropdown لتحديد الكمية (من 1 إلى 50)
  const quantitySelect = document.createElement("select");
  quantitySelect.className = "quantity-dropdown";
  for (let i = 1; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    quantitySelect.appendChild(option);
  }

  // إنشاء زر حذف باستخدام أيقونة FontAwesome (نمط solid)
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M170.5 51.6L151.5 80l145 0-19-28.4c-1.5-2.2-4-3.6-6.7-3.6l-93.7 0c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80 368 80l48 0 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-8 0 0 304c0 44.2-35.8 80-80 80l-224 0c-44.2 0-80-35.8-80-80l0-304-8 0c-13.3 0-24-10.7-24-24S10.7 80 24 80l8 0 48 0 13.8 0 36.7-55.1C140.9 9.4 158.4 0 177.1 0l93.7 0c18.7 0 36.2 9.4 46.6 24.9zM80 128l0 304c0 17.7 14.3 32 32 32l224 0c17.7 0 32-14.3 32-32l0-304L80 128zm80 64l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16z"/></svg>';
  deleteBtn.title = "Gericht Löschen";
  deleteBtn.addEventListener("click", function () {
    li.remove();
  });

  // ترتيب العناصر داخل li
  li.appendChild(itemInfo);
  li.appendChild(quantitySelect);
  li.appendChild(deleteBtn);

  // إضافة العنصر إلى قائمة السلة
  cartItems.appendChild(li);

  // عرض الحاوية إذا لم تكن ظاهرة
  overlay.style.display = "flex";
}




