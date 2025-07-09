// Конфигурация
const API_URL = "http://localhost:3001/patients";
const BMI_CATEGORIES = {
  underweight: {
    max: 18.5,
    class: "underweight",
    label: "Недостаток веса",
    icon: "⚠️",
  },
  normal: { max: 25, class: "normal", label: "Норма", icon: "✅" },
  overweight: {
    max: 30,
    class: "overweight",
    label: "Избыток веса",
    icon: "⚠️",
  },
  obese: { max: Infinity, class: "obese", label: "Ожирение", icon: "❌" },
};

// DOM элементы
const elements = {
  form: document.getElementById("patient-form"),
  table: document.getElementById("patients-table"),
  refreshBtn: document.getElementById("refresh-btn"),
  refreshIcon: document.getElementById("refresh-icon"),
  submitBtn: document.getElementById("submit-btn"),
  cancelEditBtn: document.getElementById("cancel-edit"),
  inputs: {
    name: document.getElementById("patient-name"),
    birthdate: document.getElementById("patient-birthdate"),
    height: document.getElementById("patient-height"),
    weight: document.getElementById("patient-weight"),
  },
  errors: {
    name: document.getElementById("name-error"),
    birthdate: document.getElementById("birthdate-error"),
    height: document.getElementById("height-error"),
    weight: document.getElementById("weight-error"),
  },
};

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  loadPatients();
  validateForm();
}

function setupEventListeners() {
  // Валидация формы при изменении полей
  Object.values(elements.inputs).forEach((input) => {
    input.addEventListener("input", validateForm);
  });

  // Обработка отправки формы
  elements.form.addEventListener("submit", handleFormSubmit);

  // Кнопка отмены редактирования
  elements.cancelEditBtn.addEventListener("click", cancelEdit);

  // Кнопка обновления данных
  elements.refreshBtn.addEventListener("click", () => {
    loadPatients();
  });

  // Кнопки экспорта
  document.getElementById("print-btn").addEventListener("click", printData);
  document
    .getElementById("export-excel-btn")
    .addEventListener("click", exportToExcel);
}

// Валидация формы
function validateForm() {
  let isValid = true;

  // Проверка всех полей
  if (!elements.inputs.name.value.trim()) {
    elements.errors.name.textContent = "Введите ФИО пациента";
    isValid = false;
  } else {
    elements.errors.name.textContent = "";
  }

  if (!elements.inputs.birthdate.value) {
    elements.errors.birthdate.textContent = "Укажите дату рождения";
    isValid = false;
  } else {
    elements.errors.birthdate.textContent = "";
  }

  const height = parseFloat(elements.inputs.height.value);
  if (!height || height < 100 || height > 250) {
    elements.errors.height.textContent = "Введите рост от 100 до 250 см";
    isValid = false;
  } else {
    elements.errors.height.textContent = "";
  }

  const weight = parseFloat(elements.inputs.weight.value);
  if (!weight || weight < 30 || weight > 300) {
    elements.errors.weight.textContent = "Введите вес от 30 до 300 кг";
    isValid = false;
  } else {
    elements.errors.weight.textContent = "";
  }

  // Активация/деактивация кнопки сохранения
  elements.submitBtn.disabled = !isValid;

  return isValid;
}

// Загрузка списка пациентов
async function loadPatients() {
  try {
    showLoading(true);

    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const patients = await response.json();
    renderPatients(patients);
  } catch (error) {
    showError(`Ошибка загрузки пациентов: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// Отображение списка пациентов
function renderPatients(patients) {
  const tbody = elements.table.querySelector("tbody");
  tbody.innerHTML = "";

  patients.forEach((patient) => {
    const row = document.createElement("tr");
    const bmiInfo = getBMIInfo(patient.height, patient.weight);

    row.innerHTML = `
      <td>${patient.name || '<span class="missing-data">не указано</span>'}</td>
      <td>${
        formatDate(patient.birthDate) ||
        '<span class="missing-data">не указана</span>'
      }</td>
      <td>${calculateBMI(patient.height, patient.weight)}</td>
      <td class="${bmiInfo.class}">
        <span class="status-icon">${bmiInfo.icon}</span> ${bmiInfo.label}
      </td>
      <td>
        <button class="edit-btn" data-id="${patient.id}">✏️</button>
        <button class="danger-btn" data-id="${patient.id}">🗑️</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // Добавляем обработчики событий
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      editPatient(id);
    });
  });

  document.querySelectorAll(".danger-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      deletePatient(id);
    });
  });
}

// Обработка отправки формы
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    showError("Заполните все обязательные поля корректно");
    return;
  }

  const patient = {
    name: elements.inputs.name.value.trim(),
    birthDate: elements.inputs.birthdate.value,
    height: parseFloat(elements.inputs.height.value),
    weight: parseFloat(elements.inputs.weight.value),
  };

  try {
    const isEditing = elements.form.dataset.editingId;
    const url = isEditing
      ? `${API_URL}/${elements.form.dataset.editingId}`
      : API_URL;
    const method = isEditing ? "PUT" : "POST";

    showLoading(true);

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient),
    });

    if (!response.ok) {
      throw new Error(
        isEditing ? "Ошибка обновления данных" : "Ошибка сохранения данных"
      );
    }

    resetForm();
    await loadPatients();
    showSuccess(
      isEditing ? "Данные пациента обновлены" : "Новый пациент добавлен"
    );
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Редактирование пациента
async function editPatient(id) {
  try {
    showLoading(true);

    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      throw new Error("Ошибка загрузки данных пациента");
    }

    const patient = await response.json();

    // Заполняем форму данными пациента
    elements.inputs.name.value = patient.name || "";
    elements.inputs.birthdate.value = patient.birthDate || "";
    elements.inputs.height.value = patient.height || "";
    elements.inputs.weight.value = patient.weight || "";

    // Активируем режим редактирования
    elements.form.dataset.editingId = id;
    elements.cancelEditBtn.classList.remove("hidden");
    elements.submitBtn.textContent = "Обновить";

    // Прокрутка к форме
    elements.form.scrollIntoView({ behavior: "smooth" });

    // Валидация формы
    validateForm();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Отмена редактирования
function cancelEdit() {
  resetForm();
  showSuccess("Редактирование отменено");
}

// Сброс формы
function resetForm() {
  elements.form.reset();
  delete elements.form.dataset.editingId;
  elements.cancelEditBtn.classList.add("hidden");
  elements.submitBtn.textContent = "Сохранить";
  validateForm();
}

// Удаление пациента
async function deletePatient(id) {
  if (!confirm("Вы уверены, что хотите удалить этого пациента?")) {
    return;
  }

  try {
    showLoading(true);

    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Ошибка удаления пациента");
    }

    await loadPatients();
    showSuccess("Пациент успешно удален");
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Показать/скрыть состояние загрузки
function showLoading(isLoading) {
  if (isLoading) {
    elements.refreshIcon.classList.add("refresh-animation");
    elements.refreshBtn.disabled = true;
    elements.submitBtn.disabled = true;
  } else {
    elements.refreshIcon.classList.remove("refresh-animation");
    elements.refreshBtn.disabled = false;
    validateForm();
  }
}

// Расчет ИМТ
function calculateBMI(height, weight) {
  if (!height || !weight) return "-";
  return (weight / (height / 100) ** 2).toFixed(1);
}

// Получение информации о категории ИМТ
function getBMIInfo(height, weight) {
  if (!height || !weight) {
    return {
      class: "",
      label: "Недостаточно данных",
      icon: "❓",
    };
  }

  const bmi = weight / (height / 100) ** 2;
  for (const [key, value] of Object.entries(BMI_CATEGORIES)) {
    if (bmi < value.max) return value;
  }
  return BMI_CATEGORIES.obese;
}

// Форматирование даты
function formatDate(dateString) {
  if (!dateString) return null;
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("ru-RU", options);
}

// Показать сообщение об ошибке
function showError(message) {
  const alert = document.createElement("div");
  alert.className = "alert error";
  alert.innerHTML = `❌ ${message}`;
  document.body.prepend(alert);
  setTimeout(() => alert.remove(), 5000);
}

// Показать сообщение об успехе
function showSuccess(message) {
  const alert = document.createElement("div");
  alert.className = "alert success";
  alert.innerHTML = `✅ ${message}`;
  document.body.prepend(alert);
  setTimeout(() => alert.remove(), 3000);
}

// Экспорт в Excel
async function exportToExcel() {
  try {
    showLoading(true);

    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error("Ошибка загрузки данных для экспорта");
    }

    const patients = await response.json();
    const data = patients.map((patient) => {
      const bmiInfo = getBMIInfo(patient.height, patient.weight);
      return {
        ФИО: patient.name,
        "Дата рождения": formatDate(patient.birthDate),
        "Рост (см)": patient.height,
        "Вес (кг)": patient.weight,
        ИМТ: calculateBMI(patient.height, patient.weight),
        "Категория ИМТ": bmiInfo.label,
        Статус: bmiInfo.icon,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Пациенты");
    XLSX.writeFile(wb, "пациенты_АГ.xlsx");
    showSuccess("Данные успешно экспортированы в Excel");
  } catch (error) {
    showError(`Ошибка экспорта: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// Печать данных
function printData() {
  window.print();
}
