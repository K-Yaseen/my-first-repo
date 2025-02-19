// adminOrders.js

// 1) تهيئة Firebase (استخدم نفس الإعدادات في admin.js/user.js)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  
  // التهيئة
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  
  // 2) دالة لعرض الطلب في واجهة الـ HTML
  function renderOrder(orderId, orderData) {
    const ordersContainer = document.getElementById("ordersContainer");
    if (!ordersContainer) return;
  
    // ننشئ بطاقة (Bootstrap Card) أو أي تنسيق آخر
    const card = document.createElement("div");
    card.className = "card mb-3 shadow-sm";
    
    // محتوى الكارد: رأس البطاقة + جسم البطاقة
    card.innerHTML = `
      <div class="card-header">
        <h5 class="mb-0">Bestellung #${orderData.orderId || orderId}</h5>
      </div>
      <div class="card-body">
        <p><strong>Datum:</strong> ${new Date(orderData.timestamp).toLocaleString()}</p>
        <p><strong>Kunde:</strong> ${orderData.customer?.vorname || ""} ${orderData.customer?.nachname || ""}</p>
        <p><strong>Option:</strong> ${orderData.deliveryOption}</p>
        <h6>Artikel:</h6>
        <ul>
          ${orderData.items
            .map(item => `<li>${item.name} (x${item.quantity})</li>`)
            .join("")}
        </ul>
        ${
          orderData.customer?.notes
            ? `<p><strong>Hinweise:</strong> ${orderData.customer.notes}</p>`
            : ""
        }
      </div>
    `;
  
    // إن أردت إضافة زرين للإجراءات (مثل تغيير حالة الطلب أو حذفه):
    // <button class="btn btn-success">Bestellung abgeschlossen</button>
  
    // إلحاق البطاقة في الحاوية
    ordersContainer.appendChild(card);
  }
  
  // 3) مستمع لجلب الطلبات من عقدة orders في الوقت الفعلي
  function listenToOrders() {
    database.ref("orders").on("child_added", (snapshot) => {
      const orderData = snapshot.val();
      const orderKey = snapshot.key; // الـ push key
  
      if (orderData) {
        renderOrder(orderKey, orderData);
      }
    });
  
    // في حال أردت متابعة تحديث الطلب (تغيير حالته مثلاً)
    database.ref("orders").on("child_changed", (snapshot) => {
      const updatedData = snapshot.val();
      const orderKey = snapshot.key;
  
      // تحديث عرض الطلب في واجهة المستخدم (مثال: مسح العنصر القديم وإنشاء عنصر جديد)
      const ordersContainer = document.getElementById("ordersContainer");
      if (!ordersContainer) return;
  
      // ابحث عن البطاقة القديمة بناءً على orderId (لو حفظته)
      // أو استخدم الـ key كـ data-attribute
      // هنا سنكتفي بمسح الكل وإعادة البناء، أو تجد طريقة أخرى تحدد بها الطلب المحدد:
      ordersContainer.innerHTML = ""; // إعادة تعيين
      reloadAllOrders(); // نجلب كل الطلبات من جديد
    });
  }
  
  // 4) في حالة تحديث أو حذف الطلب، يمكن إعادة جلبهم جميعًا
  function reloadAllOrders() {
    const ordersContainer = document.getElementById("ordersContainer");
    if (!ordersContainer) return;
    ordersContainer.innerHTML = ""; // تفريغ المحتوى
  
    database.ref("orders").once("value", (snapshot) => {
      const ordersData = snapshot.val();
      if (!ordersData) return;
      Object.keys(ordersData).forEach((key) => {
        renderOrder(key, ordersData[key]);
      });
    });
  }
  
  // 5) تشغيل المستمع عند تحميل الصفحة
  document.addEventListener("DOMContentLoaded", () => {
    listenToOrders();
  });
  