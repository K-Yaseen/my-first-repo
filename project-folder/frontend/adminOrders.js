// adminOrders.js

// 1) Firebase-Konfiguration (identisch zu admin.js / user.js)
const firebaseConfig = {
  apiKey: "AIzaSyBeAkTPw9n...",
  authDomain: "restaurant-system-f50cf.firebaseapp.com",
  databaseURL: "https://restaurant-system-f50cf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "restaurant-system-f50cf",
  storageBucket: "restaurant-system-f50cf.firebasestorage.app",
  messagingSenderId: "220436037433",
  appId: "1:220436037433:web:9bfc0f85a8806a15ee72e8"
};

// Initialisierung
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 2) Funktion zum Rendern einer einzelnen Bestellung
function renderOrder(orderId, orderData) {
  const ordersContainer = document.getElementById("ordersContainer");
  if (!ordersContainer) return;

  // Karte (Card) erstellen
  const card = document.createElement("div");
  card.className = "card mb-3 shadow-sm";

  // Zunächst machen wir sie unsichtbar, damit wir einen Fade-In Effekt haben
  card.style.opacity = "0";
  card.style.transition = "opacity 0.6s ease";

  // Inhalt der Karte
  card.innerHTML = `
    <div class="card-header">
      <h5 class="mb-0">Bestellung #${orderData.orderId || orderId}</h5>
    </div>
    <div class="card-body">
      <p><strong>Datum:</strong> ${new Date(orderData.timestamp).toLocaleString()}.</p>
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

  // Karte im Container anhängen
  ordersContainer.appendChild(card);

  // Ein kleines Timeout, damit das Element im DOM ist, bevor wir die Opacity anpassen
  setTimeout(() => {
    card.style.opacity = "1";
  }, 50);
}

// 3) Echtzeit-Abfrage der Bestellungsknoten
function listenToOrders() {
  // Neue Bestellungen (child_added)
  database.ref("orders").on("child_added", (snapshot) => {
    const orderData = snapshot.val();
    const orderKey = snapshot.key;

    if (orderData) {
      renderOrder(orderKey, orderData);
    }
  });

  // Änderungen an existierenden Bestellungen (child_changed)
  database.ref("orders").on("child_changed", (snapshot) => {
    // Bestellung hat sich verändert → wir laden alles neu
    const ordersContainer = document.getElementById("ordersContainer");
    if (!ordersContainer) return;

    ordersContainer.innerHTML = "";
    reloadAllOrders();
  });
}

// 4) Im Falle einer Aktualisierung / Löschung: Alle Bestellungen neu laden
function reloadAllOrders() {
  const ordersContainer = document.getElementById("ordersContainer");
  if (!ordersContainer) return;
  ordersContainer.innerHTML = "";

  database.ref("orders").once("value", (snapshot) => {
    const ordersData = snapshot.val();
    if (!ordersData) return;
    Object.keys(ordersData).forEach((key) => {
      renderOrder(key, ordersData[key]);
    });
  });
}

// 5) Beim Laden der Seite die Listener aktivieren
document.addEventListener("DOMContentLoaded", () => {
  listenToOrders();
});
