// ================================================
// I. Firebase-Initialisierung
// (Stellen Sie sicher, dass die Firebase-Bibliotheken vor dieser Datei geladen sind)
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
// II. Hilfsfunktionen
// ================================================
let items = [];
const userDataStore = {};

function safeJSONParse(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("JSON-Parsing-Fehler:", error);
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
// III. Funktionen für Unterschiede und Modal-Fenster
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
    console.error("Modal-Elemente nicht gefunden.");
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
// IV. Firebase- und Datenfunktionen
// ================================================
async function fetchItems() {
  try {
    const snapshot = await database.ref("items").once("value");
    const data = snapshot.val();
    items = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
  } catch (error) {
    console.error("Fehler beim Abrufen der Artikel:", error);
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
// Warenkorb-Funktionen
// ================================================

// Speichert die Warenkorbdaten im localStorage
function saveCart() {
  const cartItems = document.getElementById("cartItems");
  const itemsArray = [];
  for (let li of cartItems.children) {
    const id = li.getAttribute("data-item-id");
    const quantitySelect = li.querySelector(".quantity-dropdown");
    const quantity = quantitySelect ? parseInt(quantitySelect.value, 10) : 1;
    itemsArray.push({ id, quantity });
  }
  localStorage.setItem("cartData", JSON.stringify(itemsArray));
}

// Erstellt ein neues Warenkorbelement
function createCartItem(item, quantity) {
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");
  if (!overlay || !cartItems) return;

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
      <path d="M170.5 51.6L151.5 80l145 0-19-28.4c-1.5-2.2-4-3.6-6.7-3.6l-93.7 0c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80 368 80l48 0 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-8 0 0 304c0 44.2-35.8 80-80 80l-224 0c-44.2 0-80-35.8-80-80l0-304-8 0c-13.3 0-24-10.7-24-24S10.7 80 24 80l8 0 48 0 13.8 0 36.7-55.1C140.9 9.4 158.4 0 177.1 0l93.7 0c18.7 0 36.2 9.4 46.6 24.9zM80 128l0 304c0 17.7 14.3 32 32 32l224 0c17.7 0 32-14.3 32-32l0-304L80 128zm80 64l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16z"/>
    </svg>`;
  deleteBtn.title = "Artikel aus dem Warenkorb entfernen";
  deleteBtn.addEventListener("click", function () {
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
  overlay.style.display = "flex";
  updateCartButton();
  saveCart();
}

// Lädt den Warenkorb aus dem localStorage beim Seitenladen
function loadCart() {
  const cartData = localStorage.getItem("cartData");
  if (!cartData) return;
  try {
    const itemsArray = JSON.parse(cartData);
    itemsArray.forEach(cartItem => {
      const fullItem = items.find(i => i.id == cartItem.id);
      if (fullItem) {
        createCartItem(fullItem, cartItem.quantity);
      }
    });
  } catch (e) {
    console.error("Fehler beim Laden der Warenkorbdaten", e);
  }
}

// Aktualisiert den Warenkorb: Erhöht die Menge oder erstellt ein neues Element und speichert den Warenkorb
function updateFloatingCart(item) {
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");
  if (!overlay || !cartItems) return;

  const existingItem = cartItems.querySelector(`li[data-item-id="${item.id}"]`);
  if (existingItem) {
    const quantitySelect = existingItem.querySelector(".quantity-dropdown");
    let currentQuantity = parseInt(quantitySelect.value, 10);
    if (currentQuantity < 50) {
      currentQuantity++;
      quantitySelect.value = currentQuantity;
    }
    overlay.style.display = "flex";
    updateCartButton();
    saveCart();
    return;
  }

  // Falls nicht vorhanden, neues Element erstellen
  createCartItem(item, 1);
  saveCart();
}

// Aktualisiert den Rückkehr-Button, berechnet die Gesamtmenge aller Artikel
function updateCartButton() {
  const cartItems = document.getElementById("cartItems");
  const backToCartBtn = document.getElementById("backToCartBtn");
  const overlay = document.getElementById("floatingCartOverlay");
  if (!cartItems || !backToCartBtn) return;
  
  let totalQuantity = 0;
  for (let li of cartItems.children) {
    const quantitySelect = li.querySelector(".quantity-dropdown");
    totalQuantity += parseInt(quantitySelect.value, 10);
  }
  
  if (totalQuantity > 0) {
    backToCartBtn.style.display = "flex";
    backToCartBtn.querySelector(".item-count").textContent = totalQuantity;
  } else {
    backToCartBtn.style.display = "none";
    if (overlay) overlay.style.display = "none";
  }
}

// ================================================
// V. Bestell- und UI-Funktionen
// ================================================
function checkItem() {
  const itemNumberInput = document.getElementById("itemNumber");
  const itemNumber = itemNumberInput ? itemNumberInput.value.trim() : "";
  const result = document.getElementById("result");
  const orderDetails = document.getElementById("orderDetails");
  const addToCartBtn = document.getElementById("addToCartBtn");
  
  result.style.display = "block";
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

function addToCart() {
  if (currentItem) {
    updateFloatingCart(currentItem);
    // Nach dem Hinzufügen den Ergebnisbereich und den Hinzufügen-Button ausblenden
    const resultSection = document.getElementById("result");
    if (resultSection) resultSection.style.display = "none";
    const addToCartBtn = document.getElementById("addToCartBtn");
    if (addToCartBtn) addToCartBtn.style.display = "none";
  } else {
    alert("Es gibt keinen bestimmten Artikel zum Hinzufügen zum Warenkorb.");
  }
}

// ================================================
// VI. Öffnungszeitenfunktionen
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
      console.error("Fehler beim Laden der Öffnungszeiten:", error);
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
    console.warn("Keine gespeicherten Öffnungszeiten gefunden.");
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
  alert(message);
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

// ================================================
// VII. WhatsApp-Bestellfunktionen
// ================================================
async function sendToWhatsApp() {
  if (!validateSchedule()) return;  

  try {
    const snapshot = await database.ref("config/whatsappNumber").once("value");
    let rawNumber = snapshot.val() || "4915759100569";
    const whatsappNumber = rawNumber.replace(/\D/g, "");

    const orderNum = generateOrderNumber();
    const deliveryOption = document.getElementById("deliveryOption").value;

    const itemId = document.getElementById("whatsappBtn").getAttribute("data-item-id");
    const itemName = document.getElementById("whatsappBtn").getAttribute("data-item-name");
    const item = items.find(i => i.id == itemId);
    const ingredients = item ? item.ingredients || "Keine Angaben" : "Unbekannt";
    const price = item ? (item.price ? item.price.toFixed(2) + " €" : "Preis nicht verfügbar") : "Preis nicht verfügbar";

    const customerNotes = document.getElementById("customerNotes").value.trim();
    const welcomeMessage = "Hallo, ich möchte gerne bestellen:\n\n";

    let message = welcomeMessage + `📜 *Bestellnummer:* ${orderNum}\n\n`;

    if (customerNotes) {
      message += `📝 *Dazu:* ${customerNotes}\n\n`;
    }

    const cartItemsElement = document.getElementById("cartItems");
    if (cartItemsElement && cartItemsElement.children.length > 0) {
      message += "🛒 *Warenkorb-Inhalt:*\n";
      cartItemsElement.querySelectorAll('.cart-item').forEach(cartItem => {
        const itemInfoEl = cartItem.querySelector('.item-info');
        const quantitySelectEl = cartItem.querySelector('.quantity-dropdown');
        const itemText = itemInfoEl ? itemInfoEl.textContent.trim() : "Unbekanntes Item";
        const quantity = quantitySelectEl ? quantitySelectEl.value : "1";
        message += `${itemText} Menge: ${quantity}\n`;
      });
      message += "\n";
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
        message += 
          `🚶 *Selbstabholung*\n` +
          `📅 *Abholdatum:* ${pickupDate}\n` +
          `⏰ *Abholzeit:* ${pickupTime}\n\n`;
      }
    }

    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");

  } catch (error) {
    console.error("Fehler beim Senden an WhatsApp:", error);
    showFloatingMessage("Fehler beim Senden der Bestellung.", "red");
  }
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
// VIII. Schwebende Warenkorb-Funktionen
// ================================================
function hideFloatingCart() {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

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

// ================================================
// IX. Ereignis-Listener
// ================================================
document.getElementById("backToCartBtn").addEventListener("click", function() {
  document.getElementById("floatingCartOverlay").style.display = "flex";
});

document.addEventListener("DOMContentLoaded", async () => {
  await fetchItems();
  loadUserData();
  await loadWorkingHours();
  loadCart();

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

  updateTimeConstraints();

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

  updateCartButton();
});
