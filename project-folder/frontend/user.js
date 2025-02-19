/******************************************
 * user.js
 ******************************************/

// ================================================
// I. Firebase Initialisierung / تهيئة فايربيس
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

// تخزين الأصناف (items)
let items = [];
const userDataStore = {};

// دالة آمنة لتحويل JSON
function safeJSONParse(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    return null;
  }
}

// دالة لتوليد رقم طلب عشوائي
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
// تحصيل الأصناف من Firebase
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
// التحقق من الصنف عند الإدخال
function checkItem() {
  const itemNumberInput = document.getElementById("itemNumber");
  const itemNumber = itemNumberInput ? itemNumberInput.value.trim() : "";
  const result = document.getElementById("result");
  const orderDetails = document.getElementById("orderDetails");
  const addToCartBtn = document.getElementById("addToCartBtn");

  // إعادة إظهار قسم النتيجة عند البحث مجددًا
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

  const item = items.find(i => String(i.id) === itemNumber); 
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

// ================================================
// إضافة الصنف إلى السلة (مع تخزين السعر)
function addToCart() {
  if (!currentItem) {
    alert("Es gibt keinen bestimmten Artikel zum Hinzufügen zum Warenkorb.");
    return;
  }

  updateFloatingCart(currentItem);
  document.getElementById("result").style.display = "none";
  document.getElementById("addToCartBtn").style.display = "none";
}

// تحديث محتوى السلة العائمة مع السعر
function updateFloatingCart(item, quantity = 1, showOverlay = true) {
  const overlay = document.getElementById("floatingCartOverlay");
  const cartItems = document.getElementById("cartItems");
  if (!overlay || !cartItems) return;

  const existingItem = cartItems.querySelector(`li[data-item-id="${item.id}"]`);
  if (existingItem) {
    // إذا كان الصنف موجودًا مسبقًا
    const quantitySelect = existingItem.querySelector(".quantity-dropdown");
    let currentQuantity = parseInt(quantitySelect.value, 10);
    if (quantity > 1) {
      quantitySelect.value = quantity; 
    } else {
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

  // إنشاء عنصر جديد في السلة
  const li = document.createElement("li");
  li.className = "cart-item";
  li.setAttribute("data-item-id", item.id);

  const itemInfo = document.createElement("span");
  itemInfo.className = "item-info";
  itemInfo.textContent = `- ${item.id}. ${item.name}`;

  // قائمة منسدلة للكمية
  const quantitySelect = document.createElement("select");
  quantitySelect.className = "quantity-dropdown";
  for (let i = 1; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    quantitySelect.appendChild(option);
  }
  quantitySelect.value = quantity;

  // زر حذف
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
      <path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0L284.2 0c12.1 0 23.2 6.8 28.6 17.7L320 32l96
       0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32
       32l96 0 7.2-14.3zM32 128l384 0 0 320c0 35.3-28.7 64-64
       64L96 512c-35.3 0-64-28.7-64-64l0-320zm96 64c-8.8 0-16
       7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96
       0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2
       -16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16
       -16l0-224c0-8.8-7.2-16-16-16z"/>
    </svg>`;
  deleteBtn.title = "Gericht Löschen";
  deleteBtn.addEventListener("click", function () {
    if (confirm("Möchten Sie diesen Artikel wirklich aus dem Warenkorb entfernen?")) {
      li.remove();
      updateCartButton();
      saveCart();
    }
  });

  // ربط العناصر
  li.appendChild(itemInfo);
  li.appendChild(quantitySelect);
  li.appendChild(deleteBtn);
  cartItems.appendChild(li);

  if (showOverlay) overlay.style.display = "flex";
  updateCartButton();
  saveCart();
}

// ================================================
// الحسابات وحفظ الطلب في Firebase
function pushOrderToFirebase() {
  const cartItemsElement = document.getElementById("cartItems");
  if (!cartItemsElement || cartItemsElement.children.length === 0) {
    alert("Der Warenkorb ist leer. Eine Bestellung ohne Artikel ist nicht möglich.");
    return;
  }

  // نجلب رقم الطلب
  const orderId = generateOrderNumber();
  
  // نجمع الأصناف (اسم وسعر)
  let totalCost = 0;
  const orderedItems = [];

  // الحصول على الأصناف من cart
  cartItemsElement.querySelectorAll(".cart-item").forEach(cartItem => {
    const itemId = cartItem.getAttribute("data-item-id");
    const quantitySelectEl = cartItem.querySelector(".quantity-dropdown");
    const quantity = quantitySelectEl ? parseInt(quantitySelectEl.value) : 1;

    // ابحث عن بيانات الصنف من المصفوفة items الأصلية
    const original = items.find(it => String(it.id) === itemId);
    const unitPrice = original?.price || 0;
    const itemCost = unitPrice * quantity;
    totalCost += itemCost;

    orderedItems.push({
      id: itemId,
      name: original?.name || "Unbekannt",
      price: unitPrice,
      quantity: quantity
    });
  });

  // بيانات العميل
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

  // تكوين كائن الطلب
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

  // حفظ في Firebase
  database.ref("orders").push(orderData)
    .then(() => {
      // بدلاً من alert - نظهر النافذة الجديدة مع معلومات الطلب
      showOrderCompleteModal(orderId, totalCost, deliveryOption);
      clearCart(); // مسح السلة
    })
    .catch((error) => {
      console.error("Error pushing order to Firebase:", error);
      alert("Beim Senden der Bestellung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
    });
}

// دالة لعرض النافذة الجديدة مع رقم الطلب والتكلفة
function showOrderCompleteModal(orderId, totalCost, deliveryOption) {
  // تحديد نص الرسالة
  const orderCompleteModal = document.getElementById("orderCompleteModal");
  const orderCompleteText = document.getElementById("orderCompleteText");
  const okBtn = document.getElementById("orderCompleteOkBtn");

  if (!orderCompleteModal || !orderCompleteText || !okBtn) return;

  // نحسب النص حسب deliveryOption
  let zahlungHinweis = (deliveryOption === "delivery")
    ? "Bitte zahlen Sie den Betrag bei Erhalt der Lieferung. "
    : "Bitte zahlen Sie bei der Abholung. ";

  // نضع النص النهائي في المودال
  orderCompleteText.innerHTML = `
    <span style="font-size: 28px;">💶</span>
    <br>
    Ihre Bestellnummer lautet: <strong>${orderId}</strong><br>
    Gesamtbetrag: <strong>${totalCost.toFixed(2)} €</strong><br><br>
    ${zahlungHinweis}
    <br>
    Vielen Dank für Ihre Bestellung!
  `;

  // نظهر المودال في المنتصف
  orderCompleteModal.style.display = "flex";

  // عند الضغط على "Verstanden" نغلق المودال
  okBtn.onclick = () => {
    orderCompleteModal.style.display = "none";
  };
}

// ================================================
// باقي الدوال: hideFloatingCart, showSavePopup, etc.
// ================================================

function hideFloatingCart() {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

function showSavePopup() {
  // حفظ بيانات المستخدم
  saveUserData();
  // ثم عرض رسالة منبثقة بسيطة
  const popup = document.getElementById("popupMessage");
  if (popup) {
    popup.classList.add("show");
    setTimeout(() => {
      popup.classList.remove("show");
    }, 3000);
  }
}

// عند النقر على زر العودة إلى السلة
document.getElementById("backToCartBtn").addEventListener("click", function () {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) overlay.style.display = "flex";
});

// دالة لتحديث زر العودة إلى السلة وعدد العناصر
function updateCartButton() {
  const cartItems = document.getElementById("cartItems");
  const backToCartBtn = document.getElementById("backToCartBtn");
  const overlay = document.getElementById("floatingCartOverlay");
  if (!cartItems || !backToCartBtn) return;

  let totalQuantity = 0;
  cartItems.querySelectorAll(".cart-item").forEach(item => {
    const quantitySelect = item.querySelector(".quantity-dropdown");
    totalQuantity += parseInt(quantitySelect.value, 10);
  });

  if (totalQuantity > 0) {
    backToCartBtn.style.display = "flex";
    backToCartBtn.querySelector(".item-count").textContent = totalQuantity;
  } else {
    backToCartBtn.style.display = "none";
    if (overlay) overlay.style.display = "none";
  }
}

// حفظ السلة في LocalStorage
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

// استرجاع بيانات السلة
function loadCart() {
  const cartData = localStorage.getItem("cart");
  if (!cartData) return;
  try {
    const cartItemsArray = JSON.parse(cartData);
    const cartItemsContainer = document.getElementById("cartItems");
    cartItemsContainer.innerHTML = "";
    cartItemsArray.forEach(cartItem => {
      const item = items.find(i => String(i.id) === cartItem.id);
      if (item) {
        updateFloatingCart(item, parseInt(cartItem.quantity, 10), false);
      }
    });
  } catch (error) {
    console.error("Error loading cart:", error);
  }
}

// مسح السلة
function clearCart() {
  localStorage.removeItem("cart");
  const cartItemsContainer = document.getElementById("cartItems");
  if (cartItemsContainer) cartItemsContainer.innerHTML = "";
  updateCartButton();
}

// تطبيق إعداد الخدمة
function applyUserServiceOption(option) {
  const deliveryOptionSelect = document.getElementById("deliveryOption");
  if (option === "nurLieferung") {
    deliveryOptionSelect.innerHTML = '<option value="delivery">Lieferung</option>';
    document.getElementById("pickupScheduleField").style.display = "none";
    document.getElementById("deliveryScheduleField").style.display = "block";
    document.getElementById("deliveryFields").style.display = "block";
    deliveryOptionSelect.style.display = "none";
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

    const deliveryNote = document.querySelector("#deliveryFields p");
    if (deliveryNote) {
      deliveryNote.style.display = "block";
    }
  }
}

// وظيفة للانتقال إلى قسم إنهاء الطلب
function goToOrderDetails() {
  const overlay = document.getElementById("floatingCartOverlay");
  if (overlay) overlay.style.display = "none";

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

// عرض رسالة "الدفع عند الاستلام" قبل الإرسال
function showPaymentConfirm(onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '450px';
  modalContent.style.textAlign = 'center';

  const title = document.createElement('h2');
  title.innerText = 'Hinweis';

  const paragraph = document.createElement('p');
  paragraph.innerText = 'Die Bezahlung erfolgt erst bei Erhalt der Bestellung. Sind Sie damit einverstanden?';
  paragraph.style.margin = '15px 0';
  paragraph.style.fontSize = '16px';

  const confirmBtn = document.createElement('button');
  confirmBtn.innerText = 'Ja, fortfahren';
  confirmBtn.style.margin = '10px';
  confirmBtn.style.backgroundColor = '#28a745';
  confirmBtn.style.color = '#fff';
  confirmBtn.style.border = 'none';
  confirmBtn.style.padding = '10px 20px';
  confirmBtn.style.borderRadius = '5px';
  confirmBtn.style.cursor = 'pointer';

  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = 'Abbrechen';
  cancelBtn.style.margin = '10px';
  cancelBtn.style.backgroundColor = '#dc3545';
  cancelBtn.style.color = '#fff';
  cancelBtn.style.border = 'none';
  cancelBtn.style.padding = '10px 20px';
  cancelBtn.style.borderRadius = '5px';
  cancelBtn.style.cursor = 'pointer';

  modalContent.appendChild(title);
  modalContent.appendChild(paragraph);
  modalContent.appendChild(confirmBtn);
  modalContent.appendChild(cancelBtn);

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  confirmBtn.onclick = () => {
    document.body.removeChild(modal);
    if (onConfirm) onConfirm();
  };
  cancelBtn.onclick = () => {
    document.body.removeChild(modal);
  };
}

// ================================================
//  عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  // جلب الأصناف
  await fetchItems();
  // تحميل بيانات المستخدم (العنوان..الخ)
  loadUserData();
  // تحميل أوقات الدوام
  await loadWorkingHours();
  // استرجاع محتوى السلة
  loadCart();

  // إعداد الخدمة
  const snapshot = await firebase.database().ref("config/serviceOption").once("value");
  const serviceOption = snapshot.val() || "beides";

  const storedWorkingHours = JSON.parse(localStorage.getItem("workingHours"));
  if (storedWorkingHours) {
    updateWorkingHoursDisplay(storedWorkingHours, serviceOption);
  }

  const preLoginModal = document.getElementById("preLoginModal");
  if (preLoginModal) {
    preLoginModal.style.display = "flex";
    const continueBtn = document.getElementById("continueBtn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        preLoginModal.style.display = "none";
      });
    }
  }

  // التحديث المبدئي للوقت
  updateTimeConstraints();

  // ربط حدث زر الإرسال
  const sendOrderBtn = document.getElementById("sendOrderBtn");
  if (sendOrderBtn) {
    sendOrderBtn.addEventListener("click", () => {
      pushOrderToFirebase();
    });
  }
});

// ================================================
// نهاية الكود
