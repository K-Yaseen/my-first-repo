// ================================================
// I. Firebase Initialisierung
// ================================================

let currentItem = null;
let pendingOrderId = null;  // رقم الطلب المؤقت
let selectedOrderChannel = "";
let whatsappNumber = "";       // سيتم قراءته من Firebase

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

// Globale Variablen für Artikel & Nutzerdaten
let items = [];
const userDataStore = {};

// ================================================
// Hilfsfunktionen
// ================================================
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

// Neue Funktion: Konfiguration (phoneNumber) laden
async function fetchConfig() {
  try {
    const snapshot = await database.ref("config").once("value");
    const configData = snapshot.val() || {};
    // تعديل السطر من phoneNumber إلى whatsappNumber
    phoneNumber = configData.whatsappNumber || "";
    console.log("Telefonnummer aus Firebase:", phoneNumber);
  } catch (error) {
    console.error("Fehler beim Laden der Konfigurationsdaten:", error);
    phoneNumber = "";
  }
}


// Funktion zum Abrufen aller Artikel (Items) aus Firebase
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

// ================================================
// Anzeige des Status & Laden/Speichern von Daten
// ================================================
function showFloatingMessage(message, color = "red") {
  // Für schnelles Feedback; kann angepasst werden:
  alert(message);
}

// Daten des Nutzers aus localStorage laden (falls vorhanden)
function loadUserData() {
  const storedData = safeJSONParse(localStorage.getItem("userData"));
  if (storedData) {
    // Bestelloption
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
    // Restliche Felder
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

// Speichert die Nutzereingaben in localStorage
function saveUserData() {
  const deliveryOption = document.getElementById("deliveryOption").value;
  const vorname = document.getElementById("vorname").value.trim();
  const nachname = document.getElementById("nachname").value.trim();
  const strasse = document.getElementById("strasse").value.trim();
  const hausnummer = document.getElementById("hausnummer").value.trim();
  const plz = document.getElementById("plz").value.trim();
  const stadt = document.getElementById("stadt").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

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

  localStorage.setItem("userData", JSON.stringify(userData));
}

// ================================================
// Funktionen zur Warenkorb-Verwaltung
// ================================================
// Lädt den Warenkorb aus localStorage
function loadCart() {
  const cartData = localStorage.getItem("cart");
  if (!cartData) return;
  try {
    const cartItemsArray = JSON.parse(cartData);
    const cartItemsContainer = document.getElementById("cartItems");
    cartItemsContainer.innerHTML = "";
    cartItemsArray.forEach(cartItem => {
      const item = items.find(i => i.id == cartItem.id);
      if (item) {
        updateFloatingCart(item, cartItem.quantity, false);
      }
    });
  } catch (error) {
    console.error("Error loading cart:", error);
  }
}

// Speichert den Warenkorb in localStorage
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

// Leert den Warenkorb
function clearCart() {
  localStorage.removeItem("cart");
  const cartItemsContainer = document.getElementById("cartItems");
  if (cartItemsContainer) cartItemsContainer.innerHTML = "";
  updateCartButton();
}

// Aktualisiert die Anzeige des "Einkaufswagen"-Buttons (Anzahl Artikel)
function updateCartButton() {
  const cartItems = document.getElementById("cartItems");
  const backToCartBtn = document.getElementById("backToCartBtn");
  const overlay = document.getElementById("floatingCartOverlay");
  if (!cartItems || !backToCartBtn) return;

  let totalQuantity = 0;
  const itemsList = cartItems.getElementsByTagName("li");
  for (let i = 0; i < itemsList.length; i++) {
    const quantitySelect = itemsList[i].querySelector(".quantity-dropdown");
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

// ================================================
// Funktionen für die Anzeige / Bearbeitung der Items
// ================================================
// Überprüft, ob ein Gericht verfügbar ist
function checkItem() {
  const itemNumberInput = document.getElementById("itemNumber");
  const itemNumber = itemNumberInput ? itemNumberInput.value.trim() : "";
  const result = document.getElementById("result");
  const orderDetails = document.getElementById("orderDetails");
  const addToCartBtn = document.getElementById("addToCartBtn");

  // Reset/Hide
  result.style.display = "block";
  addToCartBtn.style.display = "none";

  if (!itemNumber) {
    result.innerHTML = `
      <div class="item-card not-available">
        <p>Bitte geben Sie eine Gerichtsnummer ein.</p>
      </div>`;
    orderDetails.style.display = "none";
    hideFloatingCart();
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
      addToCartBtn.style.display = "block";
    } else {
      orderDetails.style.display = "none";
      hideFloatingCart();
    }
  } else {
    result.innerHTML = `
      <div class="item-card not-available">
        <p>⚠️ Gerichtsnummer nicht gefunden.</p>
      </div>`;
    orderDetails.style.display = "none";
    hideFloatingCart();
  }
}

// Fügt das aktuell gefundene Gericht dem Warenkorb hinzu
function addToCart() {
  if (currentItem) {
    updateFloatingCart(currentItem);
    const resultSection = document.getElementById("result");
    if (resultSection) {
      resultSection.style.display = "none";
    }
    const addToCartBtn = document.getElementById("addToCartBtn");
    if (addToCartBtn) {
      addToCartBtn.style.display = "none";
    }
  } else {
    alert("Es gibt keinen bestimmten Artikel zum Hinzufügen zum Warenkorb.");
  }
}

// Aktualisiert oder erzeugt Einträge im fliegenden Warenkorb
function updateFloatingCart(item, quantity = 1, showOverlay = true) {
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");
  if (!overlay || !cartItems) return;

  const existingItem = cartItems.querySelector(`li[data-item-id="${item.id}"]`);
  if (existingItem) {
    const quantitySelect = existingItem.querySelector(".quantity-dropdown");
    if (quantity > 1) {
      quantitySelect.value = quantity;
    } else {
      let currentQuantity = parseInt(quantitySelect.value, 10);
      if (currentQuantity < 50) {
        currentQuantity++;
        quantitySelect.value = currentQuantity;
      }
    }
    if (showOverlay) overlay.style.display = "flex";
    updateCartButton();
    saveCart();
    return;
  }

  // Neues Listenelement:
  const li = document.createElement("li");
  li.className = "cart-item";
  li.setAttribute("data-item-id", item.id);

  const itemInfo = document.createElement("span");
  itemInfo.className = "item-info";
  itemInfo.textContent = `- ${item.id}. ${item.name}`;

  const quantitySelect = document.createElement("select");
  quantitySelect.className = "quantity-dropdown";
  for (let i = 1; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    quantitySelect.appendChild(option);
  }
  quantitySelect.value = quantity;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
      <path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0L284.2 0c12.1 0 23.2 6.8 28.6 17.7L320 32l96
               0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0
               7.2-14.3zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-320zm
               96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16
               -16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8
               -7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2
               16-16l0-224c0-8.8-7.2-16-16-16z"/>
    </svg>`;
  deleteBtn.title = "Gericht löschen";
  deleteBtn.addEventListener("click", () => {
    if (confirm("Möchten Sie diesen Artikel wirklich aus dem Warenkorb entfernen?")) {
      li.remove();
      updateCartButton();
      saveCart();
    }
  });

  li.appendChild(itemInfo);
  li.appendChild(quantitySelect);
  li.appendChild(deleteBtn);
  cartItems.appendChild(li);

  if (showOverlay) {
    overlay.style.display = "flex";
  }
  updateCartButton();
  saveCart();
}

// Blendet den fliegenden Warenkorb aus
function hideFloatingCart() {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) overlay.style.display = "none";
}

// ================================================
// Funktionen zu Öffnungszeiten & Terminprüfung
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

// Lädt die Öffnungszeiten
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

// Aktualisiert die Anzeige der Öffnungszeiten
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

      if (hours.closed) {
        segments.push("🚫");
      } else {
        if (serviceOption !== "nurLieferung" && hours.pickupStart && hours.pickupEnd) {
          segments.push(`Abholung: ${hours.pickupStart}–${hours.pickupEnd}`);
        }
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

// Prüft, ob die gewählte Zeit in den Öffnungszeiten liegt
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

// Validiert die Wunschzeit & Felder
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

// Überprüft, ob alle erforderlichen Felder bei Lieferung ausgefüllt wurden
function validateDeliveryFields() {
  const deliveryOption = document.getElementById("deliveryOption").value;
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

// ================================================
// Funktionen für die Bestellvorgänge (WhatsApp/Email)
// ================================================
function showSavePopup() {
  saveUserData();
  const popup = document.getElementById("popupMessage");
  if (popup) {
    popup.classList.add("show");
    setTimeout(() => {
      popup.classList.remove("show");
    }, 3000);
  }
}

function sendToEmail() {
  // هنا تضع كود إرسال الطلب عبر البريد الإلكتروني
  alert("Die Bestellung wird per E-Mail gesendet.");
  // يمكنك استدعاء pushOrderToFirebase هنا أيضاً إذا أردت حفظ الطلب في Firebase
  pushOrderToFirebase(pendingOrderId);
}

function sendToRestaurant() {
  // هنا تضع كود إرسال الطلب عبر صفحة المطعم
  alert("Die Bestellung wird an das Restaurant gesendet.");
  pushOrderToFirebase(pendingOrderId);
}

// ================================================
// FUNKTION ZUR BERECHNUNG DES GESAMTPREISES
// ================================================
function calculateCartTotal() {
  let total = 0;
  const cartItemsElement = document.getElementById("cartItems");
  cartItemsElement.querySelectorAll(".cart-item").forEach(cartItem => {
    const itemId = cartItem.getAttribute("data-item-id");
    const quantitySelectEl = cartItem.querySelector(".quantity-dropdown");
    const quantity = quantitySelectEl ? parseInt(quantitySelectEl.value) : 1;
    // Suche das echte Item aus 'items'
    const realItem = items.find(x => x.id == itemId);
    if (realItem && realItem.price) {
      total += realItem.price * quantity;
    }
  });
  return total;
}

// ================================================
// Bestellvorgang an Firebase (pushOrderToFirebase)
// ================================================
function pushOrderToFirebase(customOrderId) {
  const cartItemsElement = document.getElementById("cartItems");
  if (!cartItemsElement || cartItemsElement.children.length === 0) {
    alert("Der Warenkorb ist leer. Eine Bestellung ohne Artikel ist nicht möglich.");
    return;
  }

  // إذا لدينا رقم طلب جاهز من نافذة الدفع مثلاً
  // وإلا تولّده هذه الدالة
  const orderId = customOrderId || generateOrderNumber();

  const orderedItems = [];
  cartItemsElement.querySelectorAll(".cart-item").forEach(cartItem => {
    const itemInfoEl = cartItem.querySelector(".item-info");
    const quantitySelectEl = cartItem.querySelector(".quantity-dropdown");
    const itemText = itemInfoEl ? itemInfoEl.textContent.trim() : "Unbekanntes Produkt";
    const quantity = quantitySelectEl ? quantitySelectEl.value : "1";
    orderedItems.push({ name: itemText, quantity: quantity });
  });

  const deliveryOption = document.getElementById("deliveryOption").value;
  const vorname = document.getElementById("vorname").value.trim();
  const nachname = document.getElementById("nachname").value.trim();
  const strasse = document.getElementById("strasse").value.trim();
  const hausnummer = document.getElementById("hausnummer").value.trim();
  const plz = document.getElementById("plz").value.trim();
  const stadt = document.getElementById("stadt").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();
  const pickupDate = document.getElementById("pickupDate").value;
  const pickupTime = document.getElementById("pickupTime").value;
  const deliveryDate = document.getElementById("deliveryDate").value;
  const deliveryTime = document.getElementById("deliveryTime").value;

  const orderData = {
    orderId: orderId,
    timestamp: Date.now(),
    deliveryOption: deliveryOption,
    items: orderedItems,
    customer: {
      vorname,
      nachname,
      strasse,
      hausnummer,
      plz,
      stadt,
      notes
    },
    schedule: {
      pickupDate,
      pickupTime,
      deliveryDate,
      deliveryTime
    }
  };

  // Berechnung des Gesamtpreises (anhand items-Array)
  const cartTotal = calculateCartTotal();

  // Bestelldaten in Firebase speichern
  database.ref("orders").push(orderData)
    .then(() => {
      // Erfolgsnachricht mit Nummer
      showOrderSuccessMessage(orderId, cartTotal, {
        deliveryOption,
        pickupDate,
        pickupTime,
        deliveryDate,
        deliveryTime
      });
      // Warenkorb leeren
      clearCart();
    })
    .catch((error) => {
      console.error("Error pushing order to Firebase:", error);
      alert("Beim Senden der Bestellung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
    });
}

// يُظهر Nachricht mit Termin + Gesamtbetrag
function showOrderSuccessMessage(orderId, totalPrice, scheduleData) {
  let scheduleText = "";
  if (scheduleData.deliveryOption === "pickup") {
    scheduleText = `Abholung am ${scheduleData.pickupDate} um ${scheduleData.pickupTime} Uhr.`;
  } else {
    scheduleText = `Lieferung am ${scheduleData.deliveryDate} um ${scheduleData.deliveryTime} Uhr.`;
  }

  const successPopup = document.createElement('div');
  successPopup.className = 'popup';
  successPopup.style.backgroundColor = '#4caf50';
  successPopup.innerHTML = `
    <p style="margin: 0; padding: 0;">
      ✅ Bestellung <strong>${orderId}</strong> wurde erfolgreich gesendet!<br>
      Gesamtbetrag: <strong>${totalPrice.toFixed(2)} €</strong><br>
      ${scheduleText}
    </p>
  `;

  document.body.appendChild(successPopup);
  successPopup.classList.add("show");

  setTimeout(() => {
    successPopup.classList.remove("show");
    document.body.removeChild(successPopup);
  }, 5000);
}

// ================================================
// EVENT LISTENERS (DOM laden usw.)
// ================================================
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Lade Konfigurationsdaten (Telefonnummer)
  await fetchConfig();

  // 2. Lade Items
  await fetchItems();

  // 3. Lade User-Daten
  loadUserData();

  // 4. Lade Öffnungszeiten
  await loadWorkingHours();

  // 5. Lade Warenkorb, aktualisiere Button
  loadCart();
  updateCartButton();

  // ServiceOption aus Firebase laden
  const snapshot = await firebase.database().ref("config/serviceOption").once("value");
  const serviceOption = snapshot.val() || "beides";
  const storedWorkingHours = JSON.parse(localStorage.getItem("workingHours"));
  if (storedWorkingHours) {
    updateWorkingHoursDisplay(storedWorkingHours, serviceOption);
  }

  // Modal für Öffnungszeiten anzeigen
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

  const closePaymentModalBtn = document.getElementById("closePaymentModalBtn");
  if (closePaymentModalBtn) {
    closePaymentModalBtn.addEventListener("click", closePaymentInfo);
  }

  // Aktualisiert Zeit-Einschränkungen
  updateTimeConstraints();

  // Umschalten (Lieferung/Abholung)
  const deliverySelect = document.getElementById("deliveryOption");
  if (deliverySelect) {
    deliverySelect.addEventListener("change", function () {
      const selected = this.value;
      if (selected === "pickup") {
        document.getElementById("pickupScheduleField").style.display = "block";
        document.getElementById("deliveryScheduleField").style.display = "none";
        document.getElementById("deliveryFields").style.display = "none";
      } else if (selected === "delivery") {
        document.getElementById("deliveryScheduleField").style.display = "block";
        document.getElementById("deliveryFields").style.display = "block";
        document.getElementById("pickupScheduleField").style.display = "none";
      }
    });
  }

  const sendOrderBtn = document.getElementById("sendOrderBtn");
  if (sendOrderBtn) {
    sendOrderBtn.addEventListener("click", () => {
      showPaymentInfo();
    });
  }
});

// Zeigt / Versteckt den fliegenden Warenkorb
document.getElementById("backToCartBtn").addEventListener("click", function () {
  document.getElementById("floatingCartOverlay").style.display = "flex";
});

// Navigiert zurück zum Suchfeld
function redirectToSearchField() {
  const searchField = document.getElementById("itemNumber");
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

// Wechsel zur Bestellübersicht
function goToOrderDetails() {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
  const orderDetails = document.getElementById("orderDetails");
  if (orderDetails) {
    orderDetails.style.display = "block";
    orderDetails.scrollIntoView({ behavior: 'smooth' });
    orderDetails.classList.add('highlight-section');
    setTimeout(() => {
      orderDetails.classList.remove('highlight-section');
    }, 4000);
  }
}

// Einstellung der ServiceOption (z. B. nur Lieferung/Abholung)
firebase.database().ref("config/serviceOption").on("value", function (snapshot) {
  const option = snapshot.val() || "beides";
  applyUserServiceOption(option);
});

// Passt die Oberfläche an je nach Option
function applyUserServiceOption(option) {
  const deliveryOptionSelect = document.getElementById("deliveryOption");
  if (option === "nurLieferung") {
    deliveryOptionSelect.innerHTML = '<option value="delivery">Lieferung</option>';
    document.getElementById("pickupScheduleField").style.display = "none";
    document.getElementById("deliveryScheduleField").style.display = "block";
    document.getElementById("deliveryFields").style.display = "block";
    deliveryOptionSelect.style.display = "none";
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
    deliveryOptionSelect.innerHTML = '<option value="pickup">Selbstabholung</option><option value="delivery">Lieferung</option>';
    deliveryOptionSelect.style.display = "block";
    const deliveryNote = document.querySelector("#deliveryFields p");
    if (deliveryNote) {
      deliveryNote.style.display = "block";
    }
  }
}

/**
 * يعرض مودال يوضّح للعميل طريقة الدفع
 * حسب الخيار الذي اختاره (استلام/T Lieferung).
 * + Anzeige des Gesamtbetrags
 * + Zusätzliches Notizfeld
 */
function showPaymentInfo() {
  const paymentModal = document.getElementById("paymentInfoModal");
  const paymentTextEl = document.getElementById("paymentInfoText");
  const paymentInfoTotalEl = document.getElementById("paymentInfoTotal");
  const paymentOrderIdEl = document.getElementById("paymentInfoOrderId");

  const totalPrice = calculateCartTotal().toFixed(2);
  if (paymentInfoTotalEl) {
    paymentInfoTotalEl.textContent = "Gesamtbetrag: " + totalPrice + " €";
  }

  paymentTextEl.textContent = "Sie bezahlen Ihre Bestellung bei Erhalt";

  // 1. توليد رقم الطلب وحفظه في متغير عام
  pendingOrderId = generateOrderNumber();

  // 2. عرض رقم الطلب داخل المودال
  if (paymentOrderIdEl) {
    paymentOrderIdEl.innerHTML = `
      <span style="color: red;">
        Bitte zeigen Sie diese Bestellnummer <br>
        <span style="font-size: 40px;">(${pendingOrderId})</span> <br>
        dem Mitarbeiter
      </span>
    `;
  }

  paymentModal.classList.add("show");
}

/**
 * إغلاق مودال الدفع + دمج الملاحظات الإضافية مع الملاحظات الأصلية
 */
function closePaymentInfo() {
  const paymentModal = document.getElementById("paymentInfoModal");
  paymentModal.classList.remove("show");

  const additionalNotesEl = document.getElementById("additionalNotes");
  const mainNotesEl = document.getElementById("customerNotes");
  if (additionalNotesEl && mainNotesEl) {
    const extraNotes = additionalNotesEl.value.trim();
    const existingNotes = mainNotesEl.value.trim();
    if (extraNotes) {
      if (existingNotes) {
        mainNotesEl.value = existingNotes + "\n" + extraNotes;
      } else {
        mainNotesEl.value = extraNotes;
      }
    }
  }

  // تنفيذ الطلب بناءً على قناة الإرسال المختارة
  if (selectedOrderChannel === "whatsapp") {
    sendToWhatsApp();
  } else if (selectedOrderChannel === "email") {
    sendToEmail();
  } else if (selectedOrderChannel === "restaurant") {
    pushOrderToFirebase(pendingOrderId);
  }
}

// WhatsApp-Funktion, die phoneNumber aus Firebase verwendet
function sendToWhatsApp() {
  // 1) التحقق من الحقول الضرورية
  if (!validateDeliveryFields()) return;
  if (!validateSchedule()) return;

  const cartItemsElement = document.getElementById("cartItems");
  if (!cartItemsElement || cartItemsElement.children.length === 0) {
    alert("Der Warenkorb ist leer. Eine Bestellung ohne Artikel ist nicht möglich.");
    return;
  }

  // 2) جمع البيانات الأساسية من الصفحة
  const deliveryOption = document.getElementById("deliveryOption").value;
  const vorname = document.getElementById("vorname").value.trim();
  const nachname = document.getElementById("nachname").value.trim();
  const strasse = document.getElementById("strasse").value.trim();
  const hausnummer = document.getElementById("hausnummer").value.trim();
  const plz = document.getElementById("plz").value.trim();
  const stadt = document.getElementById("stadt").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

  let dateText = "";
  let timeText = "";

  if (deliveryOption === "delivery") {
    const deliveryDate = document.getElementById("deliveryDate").value;
    const deliveryTime = document.getElementById("deliveryTime").value;
    dateText = deliveryDate;
    timeText = deliveryTime;
  } else {
    const pickupDate = document.getElementById("pickupDate").value;
    const pickupTime = document.getElementById("pickupTime").value;
    dateText = pickupDate;
    timeText = pickupTime;
  }

  // 3) تجهيز نص محتوى السلة (Warenkorb-Inhalt)
  let warenkorbText = "";
  cartItemsElement.querySelectorAll(".cart-item").forEach(cartItem => {
    const itemInfoEl = cartItem.querySelector(".item-info");
    const quantitySelectEl = cartItem.querySelector(".quantity-dropdown");
    const itemName = itemInfoEl ? itemInfoEl.textContent.trim() : "Unbekanntes Produkt";
    const quantity = quantitySelectEl ? quantitySelectEl.value : "1";
    // يمكن تخصيص التنسيق داخل السطر كما تشاء
    warenkorbText += `- ${itemName} Menge: ${quantity}\n`;
  });

  // 4) تجهيز رابط Google Maps استناداً للعنوان
  //    لو أردت وضعه فقط في حال التوصيل، يمكن عمل شرط if (deliveryOption === "delivery") ...
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(strasse + " " + hausnummer + ", " + plz + " " + stadt)}`;

  // 5) بناء النص بالشكل المطلوب
  // ملاحظة: استخدمت pendingOrderId كرقم الطلب (إن وجد)
  let orderText = "";
  orderText += `Hallo, ich möchte gerne bestellen:\n\n`;
  
  if (pendingOrderId) {
    orderText += `Bestellnummer: ${pendingOrderId}\n\n`;
  }

  orderText += `Warenkorb-Inhalt:\n${warenkorbText}\n`; 
  // مثلاً لو أردت أن تعرض الملاحظات هنا أيضاً:
  // if (notes) orderText += `Notizen: ${notes}\n\n`;
  
  // بيانات الاسم
  orderText += `Name: ${vorname} ${nachname}\n\n`;
  
  // طريقة التوصيل أو الاستلام
  if (deliveryOption === "delivery") {
    orderText += `Lieferung\n`;
    orderText += `Adresse:\n${strasse} ${hausnummer}, ${plz} ${stadt}\n\n`;
    orderText += `Standort auf Google Maps:\n${googleMapsLink}\n\n`;
    orderText += `Lieferdatum: ${dateText}\n`;
    orderText += `Lieferzeit: ${timeText}\n`;
  } else {
    orderText += `Selbstabholung\n\n`;
    orderText += `Abholdatum: ${dateText}\n`;
    orderText += `Abholzeit: ${timeText}\n`;
  }

  // يمكنك إضافة سطر فارغ أو معلومات إضافية في النهاية
  // orderText += `\nWeitere Hinweise: ${notes}\n`;

  // 6) حساب المجموع (إن أردت إرفاقه في الرسالة)
  const totalPrice = calculateCartTotal().toFixed(2);
  // orderText += `\nGesamtpreis: ${totalPrice} €\n`; // إذا تريد إظهاره

  // 7) إرسال إلى واتساب عبر الرقم المحفوظ في phoneNumber
  if (!phoneNumber) {
    alert("Es wurde keine WhatsApp-Nummer konfiguriert.");
    return;
  }

  const encodedMessage = encodeURIComponent(orderText);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}
