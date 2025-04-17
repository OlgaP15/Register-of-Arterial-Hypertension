// Импорт Firebase модулей
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBFVC-uuttk-hQIbFh_NTH5K-OfX_AG1eE",
  authDomain: "ag-registry-4469f.firebaseapp.com",
  projectId: "ag-registry-4469f",
  storageBucket: "ag-registry-4469f.firebasestorage.app",
  messagingSenderId: "669615849852",
  appId: "1:669615849852:web:8de19c2aba3b7df3f864f9",
  measurementId: "G-M0ZFWNNNZ5"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM элементы
const loginBtn = document.getElementById("login-btn");
const authModal = document.getElementById("auth-modal");
const closeModal = document.querySelector(".close");

// Показать/скрыть модальное окно
loginBtn.addEventListener("click", () => authModal.style.display = "block");
closeModal.addEventListener("click", () => authModal.style.display = "none");

// Переключение между формами
document.getElementById("switch-to-register").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("register-form").classList.remove("hidden");
});

document.getElementById("switch-to-login").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("register-form").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
});

document.getElementById("forgot-password").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("reset-form").classList.remove("hidden");
});

document.getElementById("back-to-login").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("reset-form").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
});

// Регистрация
document.getElementById("register-submit").addEventListener("click", () => {
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const role = document.getElementById("register-role").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return db.collection("users").doc(userCredential.user.uid).set({
        email: email,
        role: role
      });
    })
    .then(() => {
      return auth.currentUser.sendEmailVerification();
    })
    .then(() => {
      document.getElementById("register-form").classList.add("hidden");
      document.getElementById("verify-email-notice").classList.remove("hidden");
    })
    .catch((error) => alert("Ошибка: " + error.message));
});

// Вход
document.getElementById("login-submit").addEventListener("click", () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      if (!userCredential.user.emailVerified) {
        alert("Подтвердите email!");
        auth.signOut();
      } else {
        authModal.style.display = "none";
        loadPatients();
      }
    })
    .catch((error) => alert("Ошибка: " + error.message));
});

// Восстановление пароля
document.getElementById("reset-submit").addEventListener("click", () => {
  const email = document.getElementById("reset-email").value;
  auth.sendPasswordResetEmail(email)
    .then(() => alert("Письмо отправлено!"))
    .catch((error) => alert("Ошибка: " + error.message));
});

// Добавление пациента
document.getElementById("patient-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const patient = {
    name: document.getElementById("patient-name").value,
    birthDate: document.getElementById("patient-birthdate").value,
    height: parseFloat(document.getElementById("patient-height").value),
    weight: parseFloat(document.getElementById("patient-weight").value)
  };

  db.collection("patients").add(patient)
    .then(() => {
      alert("Пациент добавлен!");
      document.getElementById("patient-form").reset();
      loadPatients();
    })
    .catch((error) => alert("Ошибка: " + error.message));
});

// Загрузка пациентов
function loadPatients() {
  db.collection("patients").get().then((querySnapshot) => {
    const tableBody = document.querySelector("#patients-table tbody");
    tableBody.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
      const patient = doc.data();
      const row = `<tr>
        <td>${patient.name || "-"}</td>
        <td>${patient.birthDate || "-"}</td>
        <td>${calculateBMI(patient.height, patient.weight) || "-"}</td>
        <td>
          <button onclick="viewPatientDetails('${doc.id}')">Просмотр</button>
          <button onclick="deletePatient('${doc.id}')">Удалить</button>
        </td>
      </tr>`;
      tableBody.innerHTML += row;
    });
  });
}

// Просмотр деталей пациента
function viewPatientDetails(patientId) {
  db.collection("patients").doc(patientId).get()
    .then((doc) => {
      const patient = doc.data();
      alert(`
        ФИО: ${patient.name}\n
        Дата рождения: ${patient.birthDate}\n
        Рост: ${patient.height} см\n
        Вес: ${patient.weight} кг\n
        ИМТ: ${calculateBMI(patient.height, patient.weight)}
      `);
    });
}

// Удаление пациента
function deletePatient(patientId) {
  if (confirm("Удалить пациента?")) {
    db.collection("patients").doc(patientId).delete()
      .then(() => loadPatients())
      .catch((error) => alert("Ошибка: " + error.message));
  }
}

// Расчет ИМТ
function calculateBMI(height, weight) {
  if (!height || !weight) return null;
  return (weight / ((height / 100) ** 2)).toFixed(1);
}

// Печать данных
document.getElementById("print-btn").addEventListener("click", () => {
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Данные пациента</title>
        <style>
          body { font-family: Arial; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h2>Данные пациента</h2>
        ${document.getElementById("patients-table").outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
});

// Экспорт в Excel
document.getElementById("export-excel-btn").addEventListener("click", () => {
  const table = document.getElementById("patients-table");
  const workbook = XLSX.utils.table_to_book(table);
  XLSX.writeFile(workbook, "пациенты_АГ.xlsx");
});

// Проверка аутентификации при загрузке
auth.onAuthStateChanged((user) => {
  if (user && user.emailVerified) {
    db.collection("users").doc(user.uid).get()
      .then((doc) => {
        document.querySelector(".patient-form").classList.remove("hidden");
        document.querySelector(".patient-list").classList.remove("hidden");
        if (doc.data().role === "admin") {
          document.getElementById("admin-panel").classList.remove("hidden");
        }
        loadPatients();
      });
  }
});
// Инициализация при загрузке
document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        // Пользователь авторизован
        document.querySelector(".patient-form").classList.remove("hidden");
        document.querySelector(".patient-list").classList.remove("hidden");
        loadPatients();
      }
    });
  });