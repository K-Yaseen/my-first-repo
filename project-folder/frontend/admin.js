// تهيئة Firebase
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

let categoriesData = {};

/* ---------- تحميل الوظائف عند تحميل الصفحة ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // جلب بيانات الأقسام أولاً، ثم الأصناف
  database.ref("categories").on("value", (snapshot) => {
    categoriesData = snapshot.val() || {};
    fetchItems();
  });
  
  loadWorkingHours();
  loadUserData();
});

/* ---------- وظائف رقم الواتساب ---------- */
function showToast(message, color = "#4caf50") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.backgroundColor = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function saveWhatsAppNumber() {
  const number = document.getElementById("whatsappNumber").value.trim();
  if (!number) {
    showToast("Bitte geben Sie eine gültige WhatsApp Nummer ein.", "#f44336");
    return;
  }
  database.ref("config/whatsappNumber").set(number, (error) => {
    if (error) {
      showToast("Fehler beim Speichern der WhatsApp Nummer.", "#f44336");
    } else {
      showToast("WhatsApp Nummer erfolgreich gespeichert!", "#4caf50");
    }
  });
}

/* ---------- وظائف إدارة الأصناف ---------- */
function fetchItems() {
  database.ref("items").on("value", (snapshot) => {
    const data = snapshot.val();
    const itemList = document.getElementById("item-list");

    if (data) {
      // تحويل البيانات إلى مصفوفة وفرزها حسب رقم الصنف
      let items = Array.isArray(data) ? data : Object.values(data);
      items.sort((a, b) => (a.id || 0) - (b.id || 0));
      
      // تجميع الأصناف حسب القسم باستخدام بيانات الأقسام
      const grouped = {};
      items.forEach((item) => {
        const catKey = item.category || "uncategorized";
        const catName = (categoriesData[catKey] && categoriesData[catKey].name) 
                        ? categoriesData[catKey].name 
                        : catKey;
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(item);
      });
      
      // بناء أكورديون لعرض الأقسام والأصناف
      let accordionHTML = "";
      let accordionIndex = 0;
      Object.keys(grouped).forEach((categoryName) => {
        accordionIndex++;
        const collapseId = "collapse" + accordionIndex;
        const headerId = "heading" + accordionIndex;
        
        // عناصر كل صنف
        const itemsHTML = grouped[categoryName].map((item) => `
          <div class="item-row">
            <div class="item-header d-flex justify-content-between align-items-center flex-wrap">
              <div class="item-info">
                <span class="item-id fw-bold">${item.id}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-price">${item.price ? item.price + " €" : "N/A"}</span>
              </div>
              <div class="item-controls d-flex align-items-center gap-2">
                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    ${item.available ? "checked" : ""}
                    onchange="toggleAvailability(${item.id})"
                  />
                  <span class="slider"></span>
                </label>
                <button class="icon-button" onclick="editItem(${item.id})">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="icon-button delete" onclick="deleteItem(${item.id})">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
            <div class="item-ingredients">
              ${item.ingredients || "N/A"}
            </div>
          </div>
        `).join("");

        accordionHTML += `
          <div class="accordion-item">
            <h2 class="accordion-header" id="${headerId}">
              <button
                class="accordion-button ${accordionIndex > 1 ? "collapsed" : ""}"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#${collapseId}"
                aria-expanded="${accordionIndex === 1 ? "true" : "false"}"
                aria-controls="${collapseId}"
              >
                ${categoryName} (${grouped[categoryName].length})
              </button>
            </h2>
            <div
              id="${collapseId}"
              class="accordion-collapse collapse ${accordionIndex === 1 ? "show" : ""}"
              aria-labelledby="${headerId}"
              data-bs-parent="#item-list"
            >
              <div class="accordion-body">
                ${itemsHTML}
              </div>
            </div>
          </div>
        `;
      });
      
      itemList.innerHTML = `<div class="accordion" id="itemAccordion">${accordionHTML}</div>`;
    } else {
      itemList.innerHTML = "<li>Keine Artikel vorhanden.</li>";
    }
  });
}

function addOrUpdateItem() {
  const newItemId = parseInt(document.getElementById("new-item-id").value.trim(), 10);
  const newItemName = document.getElementById("new-item-name").value.trim();
  const newItemPrice = document.getElementById("new-item-price").value.trim();
  const newItemIngredients = document.getElementById("new-item-ingredients").value.trim();
  const newItemCategory = document.getElementById("new-item-category").value.trim();

  if (isNaN(newItemId) || newItemName === "" || newItemPrice === "" || newItemIngredients === "") {
    showToast("Bitte alle Felder ausfüllen.", "#f44336");
    return;
  }

  database.ref("items").once("value").then((snapshot) => {
    let data = snapshot.val() || [];
    let items = Array.isArray(data) ? data : Object.values(data);

    const existingIndex = items.findIndex((item) => item.id === newItemId);
    if (existingIndex !== -1) {
      // تعديل صنف موجود
      items[existingIndex].name = newItemName;
      items[existingIndex].price = parseFloat(newItemPrice);
      items[existingIndex].ingredients = newItemIngredients;
      // يمكن تعديل القسم أو الإبقاء عليه كما هو
      // items[existingIndex].category = newItemCategory;

      // تحديد مصدر التعديل
      items[existingIndex].lastUpdateSource = "adminPanel";

    } else {
      // إضافة صنف جديد
      items.push({
        id: newItemId,
        name: newItemName,
        price: parseFloat(newItemPrice),
        ingredients: newItemIngredients,
        category: newItemCategory,
        available: true,
        lastUpdateSource: "adminPanel"
      });
    }
    items.sort((a, b) => a.id - b.id);
    database.ref("items").set(items, (error) => {
      if (error) {
        showToast("Fehler beim Speichern des Artikels.", "#f44336");
      } else {
        showToast("Artikel erfolgreich gespeichert!", "#4caf50");
        // إعادة تعيين الحقول
        document.getElementById("new-item-id").value = "";
        document.getElementById("new-item-name").value = "";
        document.getElementById("new-item-price").value = "";
        document.getElementById("new-item-ingredients").value = "";
        document.getElementById("new-item-category").value = "";
      }
    });
  });
}

function deleteItem(id) {
  database.ref("items").once("value").then((snapshot) => {
    let data = snapshot.val() || [];
    let items = Array.isArray(data) ? data : Object.values(data);

    const updatedItems = items.filter((item) => item.id !== id);
    database.ref("items").set(updatedItems, (error) => {
      if (error) {
        showToast("Fehler beim Löschen des Artikels.", "#f44336");
      } else {
        showToast("Artikel erfolgreich gelöscht!", "#4caf50");
      }
    });
  });
}

function toggleAvailability(id) {
  database.ref("items").once("value").then((snapshot) => {
    let data = snapshot.val() || [];
    let items = Array.isArray(data) ? data : Object.values(data);

    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      items[index].available = !items[index].available;
      // تحديد مصدر التعديل
      items[index].lastUpdateSource = "adminPanel";

      database.ref("items").set(items);
      showToast(
        `Gericht ${items[index].name} ist jetzt ${items[index].available ? "Verfügbar" : "Nicht verfügbar"}`,
        items[index].available ? "#4caf50" : "#f44336"
      );
    }
  });
}

function editItem(id) {
  database.ref("items").once("value").then((snapshot) => {
    let data = snapshot.val() || [];
    let items = Array.isArray(data) ? data : Object.values(data);

    const item = items.find((i) => i.id === id);
    if (item) {
      document.getElementById("new-item-id").value = item.id;
      document.getElementById("new-item-name").value = item.name;
      document.getElementById("new-item-price").value = item.price;
      document.getElementById("new-item-ingredients").value = item.ingredients;
      document.getElementById("new-item-category").value = item.category || "";
    }
  });
}

/* ---------- وظائف إدارة أوقات الدوام ---------- */
function loadWorkingHours() {
  database.ref("workingHours").once("value").then((snapshot) => {
    const data = snapshot.val();
    if (data) {
      localStorage.setItem("workingHours", JSON.stringify(data));
      updateWorkingHoursDisplay(data);
      fillWorkingHoursForm(data);
    }
  });
}

function fillWorkingHoursForm(workingHours) {
  document.querySelectorAll("#workingHoursTable tr[data-day]").forEach((row) => {
    let day = row.getAttribute("data-day");
    let inputs = row.querySelectorAll("input");
    if (workingHours[day]) {
      inputs[0].value = workingHours[day].pickupStart || "";
      inputs[1].value = workingHours[day].pickupEnd || "";
      inputs[2].value = workingHours[day].deliveryStart || "";
      inputs[3].value = workingHours[day].deliveryEnd || "";
    }
  });
}

function updateWorkingHoursDisplay(workingHours) {
  let container = document.getElementById("workingHoursDisplay");
  if (container) {
    container.innerHTML = "<h3>Öffnungszeiten</h3>";
    Object.keys(workingHours).forEach((day) => {
      let hours = workingHours[day];
      let timeText = hours.closed
        ? "🚫 Geschlossen"
        : `Abholung: ${hours.pickupStart || "--:--"} - ${hours.pickupEnd || "--:--"} | Lieferung: ${hours.deliveryStart || "--:--"} - ${hours.deliveryEnd || "--:--"}`;
      let entry = document.createElement("p");
      entry.innerHTML = `<strong>${day}:</strong> ${timeText}`;
      container.appendChild(entry);
    });
  }
}

function saveWorkingHours() {
  let workingHours = {};
  document.querySelectorAll("#workingHoursTable tr[data-day]").forEach((row) => {
    let day = row.getAttribute("data-day");
    let inputs = row.querySelectorAll("input");
    workingHours[day] = {
      pickupStart: inputs[0].value || null,
      pickupEnd: inputs[1].value || null,
      deliveryStart: inputs[2].value || null,
      deliveryEnd: inputs[3].value || null,
      closed: !inputs[0].value && !inputs[1].value && !inputs[2].value && !inputs[3].value
    };
  });
  database.ref("workingHours").set(workingHours, (error) => {
    if (error) {
      showToast("Fehler beim Speichern der Öffnungszeiten.", "#f44336");
    } else {
      localStorage.setItem("workingHours", JSON.stringify(workingHours));
      showToast("Öffnungszeiten erfolgreich gespeichert!", "#4caf50");
      updateWorkingHoursDisplay(workingHours);
      fillWorkingHoursForm(workingHours);
    }
  });
}

/* ---------- وظائف إضافية (مثال على نظام الطلب) ---------- */
let items = [];
const userDataStore = {};

function loadUserData() {
  const storedData = JSON.parse(localStorage.getItem("userData"));
  if (storedData) {
    // استعادة بيانات المستخدم إذا كانت موجودة
  }
}
