// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBeAkTPw...",
  authDomain: "restaurant-system-f50cf.firebaseapp.com",
  databaseURL:
    "https://restaurant-system-f50cf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "restaurant-system-f50cf",
  storageBucket: "restaurant-system-f50cf.appspot.com",
  messagingSenderId: "220436037433",
  appId: "1:220436037433:web:9bfc0f85a8806a15ee72e8",
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// لتخزين الأقسام في الذاكرة (إذا احتجنا لها)
let categoriesData = {};

/* ---------- Toast للتنبيهات ---------- */
function showToast(message, color = "#4caf50") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.backgroundColor = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ---------- حفظ رقم الواتساب ---------- */
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

/* ---------- تحميل الأقسام (categories) ---------- */
function loadCategories() {
  database.ref("categories").on("value", (snapshot) => {
    categoriesData = snapshot.val() || {};
    fetchItems(); // بعد تحميل الأقسام، نجلب الأصناف
  });
}

/* ---------- جلب وعرض الأصناف (items) ---------- */
function fetchItems() {
  database.ref("items").on("value", (snapshot) => {
    let items = snapshot.val() || [];
    if (!Array.isArray(items)) {
      items = Object.values(items);
    }
    const itemList = document.getElementById("item-list");

    // فرز الأصناف حسب رقم الصنف (id)
    items.sort((a, b) => (a.id || 0) - (b.id || 0));

    // تجميع الأصناف حسب القسم
    const grouped = {};
    items.forEach((item) => {
      const catKey =
        item.category && categoriesData[item.category]
          ? item.category
          : "uncategorized";
      if (!grouped[catKey]) grouped[catKey] = [];
      grouped[catKey].push(item);
    });

    // بناء الأكورديون لعرض الأقسام والأصناف
    let accordionHTML = "";
    let accordionIndex = 0;

    Object.keys(grouped).forEach((catKey) => {
      accordionIndex++;
      const collapseId = "collapse" + accordionIndex;
      const headerId = "heading" + accordionIndex;
      const catName = categoriesData[catKey]?.name || "Uncategorized";

      // الأصناف في هذا القسم
      const itemsHTML = grouped[catKey]
        .map(
          (item) => `
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
          `
        )
        .join("");

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
              ${catName} (${grouped[catKey].length})
            </button>
          </h2>
          <div
            id="${collapseId}"
            class="accordion-collapse collapse ${accordionIndex === 1 ? "show" : ""}"
            aria-labelledby="${headerId}"
            data-bs-parent="#itemAccordion"
          >
            <div class="accordion-body">
              ${itemsHTML}
            </div>
          </div>
        </div>
      `;
    });

    itemList.innerHTML = `<div class="accordion" id="itemAccordion">${accordionHTML}</div>`;
  });
}

/* ---------- تعديل صنف موجود (updateItem) ---------- */
function updateItem() {
  const itemIdRaw = document.getElementById("edit-item-id").value.trim();
  if (!itemIdRaw) {
    showToast("Bitte geben Sie eine Artikel-ID ein.", "#f44336");
    return;
  }
  const itemId = parseInt(itemIdRaw, 10);

  const newName = document.getElementById("edit-item-name").value.trim();
  const newPriceRaw = document.getElementById("edit-item-price").value.trim();
  const newPrice = newPriceRaw ? parseFloat(newPriceRaw) : null;
  const newIngredients = document
    .getElementById("edit-item-ingredients")
    .value.trim();

  database.ref("items").once("value").then((snapshot) => {
    let items = snapshot.val() || [];
    if (!Array.isArray(items)) {
      items = Object.values(items);
    }

    const existingIndex = items.findIndex((item) => item.id === itemId);
    if (existingIndex === -1) {
      showToast("Artikel-ID nicht gefunden. Kein Update möglich.", "#f44336");
      return;
    }

    // تحديث الحقول المدخلة فقط
    if (newName) {
      items[existingIndex].name = newName;
    }
    if (newPrice !== null && !isNaN(newPrice)) {
      items[existingIndex].price = newPrice;
    }
    if (newIngredients) {
      items[existingIndex].ingredients = newIngredients;
    }

    // مصدر التعديل
    items[existingIndex].lastUpdateSource = "adminPanel";

    // حفظ التعديلات
    database.ref("items").set(items, (error) => {
      if (error) {
        showToast("Fehler beim Aktualisieren des Artikels.", "#f44336");
      } else {
        showToast("Artikel erfolgreich aktualisiert!", "#4caf50");
        // Felder zurücksetzen
        document.getElementById("edit-item-id").value = "";
        document.getElementById("edit-item-name").value = "";
        document.getElementById("edit-item-price").value = "";
        document.getElementById("edit-item-ingredients").value = "";
      }
    });
  });
}

/* ---------- حذف صنف (deleteItem) ---------- */
function deleteItem(id) {
  // إظهار نافذة التأكيد للمستخدم
  if (!confirm("Möchten Sie diesen Artikel wirklich löschen?")) {
    return; // إيقاف عملية الحذف إذا تم إلغاء التأكيد
  }

  database.ref("items").once("value").then((snapshot) => {
    let items = snapshot.val() || [];
    if (!Array.isArray(items)) {
      items = Object.values(items);
    }
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



/* ---------- تبديل توفر الصنف (toggleAvailability) ---------- */
function toggleAvailability(id) {
  database.ref("items").once("value").then((snapshot) => {
    let items = snapshot.val() || [];
    if (!Array.isArray(items)) {
      items = Object.values(items);
    }
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      items[index].available = !items[index].available;
      items[index].lastUpdateSource = "adminPanel";

      database.ref("items").set(items);
      showToast(
        `Gericht ${items[index].name} ist jetzt ${items[index].available ? "Verfügbar" : "Nicht verfügbar"
        }`,
        items[index].available ? "#4caf50" : "#f44336"
      );
    }
  });
}

/* ---------- تحميل أوقات الدوام (loadWorkingHours) ---------- */
function loadWorkingHours() {
  database.ref("workingHours").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      localStorage.setItem("workingHours", JSON.stringify(data));
      updateWorkingHoursDisplay(data);
    }
  });
}


/* تعبئة حقول الاستلام */
function fillPickupHoursForm(workingHours) {
  document.querySelectorAll("#pickupHoursTable tr[data-day]").forEach((row) => {
    const day = row.getAttribute("data-day");
    const inputs = row.querySelectorAll("input");
    if (workingHours[day]) {
      inputs[0].value = workingHours[day].pickupStart || "";
      inputs[1].value = workingHours[day].pickupEnd || "";
    }
  });
}

/* تعبئة حقول التسليم */
function fillDeliveryHoursForm(workingHours) {
  document.querySelectorAll("#deliveryHoursTable tr[data-day]").forEach((row) => {
    const day = row.getAttribute("data-day");
    const inputs = row.querySelectorAll("input");
    if (workingHours[day]) {
      inputs[0].value = workingHours[day].deliveryStart || "";
      inputs[1].value = workingHours[day].deliveryEnd || "";
    }
  });
}

/* ---------- حفظ أوقات الدوام (saveWorkingHours) ---------- */
function saveWorkingHours() {
  // استرجاع البيانات الحالية من localStorage إن وجدت
  let existingWorkingHours = {};
  const stored = localStorage.getItem("workingHours");
  if (stored) {
    existingWorkingHours = JSON.parse(stored);
  }
  // نبدأ بالبيانات الحالية حتى ندمج التحديثات الجديدة عليها
  let workingHours = { ...existingWorkingHours };

  // تحديث بيانات الاستلام فقط إذا كانت الحاوية مرئية
  const pickupContainer = document.getElementById("pickupContainer");
  if (window.getComputedStyle(pickupContainer).display !== "none") {
    document.querySelectorAll("#pickupHoursTable tr[data-day]").forEach((row) => {
      const day = row.getAttribute("data-day");
      const inputs = row.querySelectorAll("input");
      if (!workingHours[day]) workingHours[day] = {};
      workingHours[day].pickupStart = inputs[0].value || null;
      workingHours[day].pickupEnd = inputs[1].value || null;
    });
  }

  // تحديث بيانات التوصيل فقط إذا كانت الحاوية مرئية
  const deliveryContainer = document.getElementById("deliveryContainer");
  if (window.getComputedStyle(deliveryContainer).display !== "none") {
    document.querySelectorAll("#deliveryHoursTable tr[data-day]").forEach((row) => {
      const day = row.getAttribute("data-day");
      const inputs = row.querySelectorAll("input");
      if (!workingHours[day]) workingHours[day] = {};
      workingHours[day].deliveryStart = inputs[0].value || null;
      workingHours[day].deliveryEnd = inputs[1].value || null;
    });
  }

  // تحديد إذا ما كان اليوم مغلقاً (عدم وجود أي أوقات)
  Object.keys(workingHours).forEach((day) => {
    const { pickupStart, pickupEnd, deliveryStart, deliveryEnd } = workingHours[day];
    workingHours[day].closed =
      !pickupStart && !pickupEnd && !deliveryStart && !deliveryEnd;
  });

  // رفع البيانات المحدثة إلى قاعدة البيانات
  database.ref("workingHours").set(workingHours, (error) => {
    if (error) {
      showToast("Fehler beim Speichern der Öffnungszeiten.", "#f44336");
    } else {
      localStorage.setItem("workingHours", JSON.stringify(workingHours));
      showToast("Abhol- und Lieferzeiten erfolgreich gespeichert!", "#4caf50");
    }
  });
}


function updateDeliveryNote() {
  // الحصول على خيار الخدمة المخزن في localStorage
  var serviceOption = localStorage.getItem("serviceOption");
  // تحديد عنصر الفقرة داخل قسم الحقول الخاصة بالتوصيل
  var deliveryNote = document.querySelector("#deliveryFields p");

  if (deliveryNote) {
    if (serviceOption === "nurLieferung") {
      deliveryNote.style.display = "none";
    } else if (serviceOption === "beides") {
      deliveryNote.style.display = "block";
    } else {
      // في حالة عدم تحديد خيار أو اختيار "Nur Abholung" مثلاً
      deliveryNote.style.display = "none";
    }
  }
}

/* ---------- عند تحميل الصفحة ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // نافذة 1: تحميل البيانات الأولية واسترجاعها من localStorage
  await fetchItems();
  loadUserData();
  await loadWorkingHours();
  loadCart(); // استرجاع بيانات السلة من localStorage

  // نافذة 2: إضافة مستمعي الأحداث لحقول الوقت والتاريخ لحفظ التغييرات
  document.getElementById("pickupTime").addEventListener("change", saveUserData);
  document.getElementById("pickupDate").addEventListener("change", saveUserData);
  document.getElementById("deliveryTime").addEventListener("change", saveUserData);
  document.getElementById("deliveryDate").addEventListener("change", saveUserData);

  // نافذة 3: التعامل مع نافذة مودال أوقات الدوام (Pre-Login Modal)
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

  // نافذة 4: تحديث قيود التوقيت بناءً على الوقت الحالي
  updateTimeConstraints();

  // نافذة 5: تغيير خيارات التوصيل والاستلام وتحديث عرض الحقول بناءً على الخيار المحدد
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
});




// دالة لتحديث إعدادات الخدمة في قاعدة البيانات
function updateServiceOption(option) {
  firebase.database().ref("config/serviceOption").set(option, function (error) {
    if (error) {
      showToast("Fehler beim Aktualisieren der Service Optionen.", "#f44336");
    } else {
      showToast("Service Optionen erfolgreich aktualisiert!", "#4caf50");
      applyServiceOption(option);
    }
  });
}

// دالة لتطبيق إعداد الخدمة على واجهة المسؤول
function applyServiceOption(option) {
  const pickupContainer = document.getElementById("pickupContainer");
  const deliveryContainer = document.getElementById("deliveryContainer");

  if (option === "nurLieferung") {
    pickupContainer.style.display = "none";
    deliveryContainer.style.display = "block";
  } else if (option === "nurAbholung") {
    deliveryContainer.style.display = "none";
    pickupContainer.style.display = "block";
  } else { // "beides"
    pickupContainer.style.display = "block";
    deliveryContainer.style.display = "block";
  }
}


// تخزين خيار الخدمة في localStorage عند اختيار زر الخدمة
document.getElementById("btnNurLieferung").addEventListener("click", function () {
  localStorage.setItem("serviceOption", "nurLieferung");
  applyServiceOption("nurLieferung");
});
document.getElementById("btnBeides").addEventListener("click", function () {
  localStorage.setItem("serviceOption", "beides");
  applyServiceOption("beides");
});
document.getElementById("btnNurAbholung").addEventListener("click", function () {
  localStorage.setItem("serviceOption", "nurAbholung");
  applyServiceOption("nurAbholung");
});



// إضافة مستمعي الأحداث للأزرار الجديدة
document.getElementById("btnNurLieferung").addEventListener("click", function () {
  updateServiceOption("nurLieferung");
});

document.getElementById("btnNurAbholung").addEventListener("click", function () {
  updateServiceOption("nurAbholung");
});

document.getElementById("btnBeides").addEventListener("click", function () {
  updateServiceOption("beides");
});

// استرجاع وتطبيق إعداد الخدمة عند تحميل الصفحة
firebase.database().ref("config/serviceOption").on("value", function (snapshot) {
  const option = snapshot.val() || "beides";
  applyServiceOption(option);
});
