// Конфигурация
const API_URL = 'http://localhost:3001/patients';
const BMI_CATEGORIES = {
  underweight: { max: 18.5, class: 'underweight', label: 'Недостаток веса', icon: '⚠️' },
  normal: { max: 25, class: 'normal', label: 'Норма', icon: '✅' },
  overweight: { max: 30, class: 'overweight', label: 'Избыток веса', icon: '⚠️' },
  obese: { max: Infinity, class: 'obese', label: 'Ожирение', icon: '❌' }
};

// DOM элементы
const elements = {
  form: document.getElementById('patient-form'),
  table: document.getElementById('patients-table'),
  refreshBtn: document.getElementById('refresh-btn'),
  submitBtn: document.getElementById('submit-btn'),
  cancelEditBtn: document.getElementById('cancel-edit'),
  inputs: {
    name: document.getElementById('patient-name'),
    birthdate: document.getElementById('patient-birthdate'),
    height: document.getElementById('patient-height'),
    weight: document.getElementById('patient-weight')
  },
  errors: {
    name: document.getElementById('name-error'),
    birthdate: document.getElementById('birthdate-error'),
    height: document.getElementById('height-error'),
    weight: document.getElementById('weight-error')
  }
};

// Инициализация
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  setupEventListeners();
  loadPatients();
  validateForm();
}

function setupEventListeners() {
  // Валидация формы при изменении полей
  Object.values(elements.inputs).forEach(input => {
    input.addEventListener('input', validateForm);
  });

  // Обработчики формы
  elements.form.addEventListener('submit', handleFormSubmit);
  elements.cancelEditBtn.addEventListener('click', cancelEdit);
  elements.refreshBtn.addEventListener('click', loadPatients);
  
  // Кнопки экспорта
  document.getElementById('print-btn').addEventListener('click', printData);
  document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
}

// Валидация формы
function validateForm() {
  let isValid = true;
  
  // Проверка всех полей
  if (!elements.inputs.name.value.trim()) {
    elements.errors.name.textContent = 'Введите ФИО пациента';
    isValid = false;
  } else {
    elements.errors.name.textContent = '';
  }
  
  if (!elements.inputs.birthdate.value) {
    elements.errors.birthdate.textContent = 'Укажите дату рождения';
    isValid = false;
  } else {
    elements.errors.birthdate.textContent = '';
  }
  
  if (!elements.inputs.height.value || elements.inputs.height.value < 100 || elements.inputs.height.value > 250) {
    elements.errors.height.textContent = 'Введите рост от 100 до 250 см';
    isValid = false;
  } else {
    elements.errors.height.textContent = '';
  }
  
  if (!elements.inputs.weight.value || elements.inputs.weight.value < 30 || elements.inputs.weight.value > 300) {
    elements.errors.weight.textContent = 'Введите вес от 30 до 300 кг';
    isValid = false;
  } else {
    elements.errors.weight.textContent = '';
  }
  
  // Активация/деактивация кнопки
  elements.submitBtn.disabled = !isValid;
  
  return isValid;
}

// Загрузка пациентов
async function loadPatients() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Ошибка загрузки данных');
    
    const patients = await response.json();
    renderPatients(patients);
  } catch (error) {
    showError(`Ошибка загрузки: ${error.message}`);
  }
}

// Рендер списка пациентов
function renderPatients(patients) {
  const tbody = elements.table.querySelector('tbody');
  tbody.innerHTML = patients.map(patient => {
    const bmiInfo = getBMIInfo(patient.height, patient.weight);
    return `
      <tr>
        <td>${patient.name || '<span class="missing-data">не указано</span>'}</td>
        <td>${formatDate(patient.birthDate) || '<span class="missing-data">не указана</span>'}</td>
        <td>${calculateBMI(patient.height, patient.weight)}</td>
        <td class="${bmiInfo.class}">
          <span class="status-icon">${bmiInfo.icon}</span> ${bmiInfo.label}
        </td>
        <td>
          <button onclick="editPatient(${patient.id})" class="edit-btn">✏️</button>
          <button onclick="deletePatient(${patient.id})" class="danger-btn">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Обработка формы
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  const patient = {
    name: elements.inputs.name.value.trim(),
    birthDate: elements.inputs.birthdate.value,
    height: parseFloat(elements.inputs.height.value),
    weight: parseFloat(elements.inputs.weight.value)
  };

  try {
    const isEditing = elements.form.dataset.editingId;
    const url = isEditing ? `${API_URL}/${elements.form.dataset.editingId}` : API_URL;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });

    if (!response.ok) throw new Error(isEditing ? 'Ошибка обновления' : 'Ошибка сохранения');
    
    resetForm();
    await loadPatients();
    showSuccess(isEditing ? 'Данные пациента обновлены' : 'Новый пациент добавлен');
  } catch (error) {
    showError(error.message);
  }
}

// Редактирование пациента
async function editPatient(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error('Ошибка загрузки данных пациента');
    
    const patient = await response.json();
    
    // Заполняем форму
    elements.inputs.name.value = patient.name || '';
    elements.inputs.birthdate.value = patient.birthDate || '';
    elements.inputs.height.value = patient.height || '';
    elements.inputs.weight.value = patient.weight || '';
    
    // Активируем режим редактирования
    elements.form.dataset.editingId = id;
    elements.cancelEditBtn.classList.remove('hidden');
    elements.submitBtn.textContent = 'Обновить';
    
    // Прокрутка к форме
    elements.form.scrollIntoView({ behavior: 'smooth' });
    
    // Валидация
    validateForm();
  } catch (error) {
    showError(error.message);
  }
}

// Отмена редактирования
function cancelEdit() {
  resetForm();
  showSuccess('Редактирование отменено');
}

// Сброс формы
function resetForm() {
  elements.form.reset();
  delete elements.form.dataset.editingId;
  elements.cancelEditBtn.classList.add('hidden');
  elements.submitBtn.textContent = 'Сохранить';
  validateForm();
}

// Удаление пациента
async function deletePatient(id) {
  if (!confirm('Вы уверены, что хотите удалить этого пациента?')) return;
  
  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Ошибка удаления');
    
    await loadPatients();
    showSuccess('Пациент удален');
  } catch (error) {
    showError(error.message);
  }
}

// Вспомогательные функции
function calculateBMI(height, weight) {
  if (!height || !weight) return '-';
  return (weight / ((height / 100) ** 2).toFixed(1);
}

function getBMIInfo(height, weight) {
  if (!height || !weight) return { class: '', label: 'Недостаточно данных', icon: '❓' };
  
  const bmi = weight / ((height / 100) ** 2);
  for (const [key, value] of Object.entries(BMI_CATEGORIES)) {
    if (bmi < value.max) return value;
  }
  return BMI_CATEGORIES.obese;
}

function formatDate(dateString) {
  if (!dateString) return null;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
}

function showError(message) {
  const alert = document.createElement('div');
  alert.className = 'alert error';
  alert.innerHTML = `❌ ${message}`;
  document.body.prepend(alert);
  setTimeout(() => alert.remove(), 5000);
}

function showSuccess(message) {
  const alert = document.createElement('div');
  alert.className = 'alert success';
  alert.innerHTML = `✅ ${message}`;
  document.body.prepend(alert);
  setTimeout(() => alert.remove(), 3000);
}

// Экспорт данных
async function exportToExcel() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Ошибка загрузки данных для экспорта');
    
    const patients = await response.json();
    const data = patients.map(patient => {
      const bmiInfo = getBMIInfo(patient.height, patient.weight);
      return {
        'ФИО': patient.name,
        'Дата рождения': formatDate(patient.birthDate),
        'Рост (см)': patient.height,
        'Вес (кг)': patient.weight,
        'ИМТ': calculateBMI(patient.height, patient.weight),
        'Категория ИМТ': bmiInfo.label,
        'Статус': bmiInfo.icon
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Пациенты");
    XLSX.writeFile(wb, "пациенты_АГ.xlsx");
    showSuccess('Данные экспортированы в Excel');
  } catch (error) {
    showError(`Ошибка экспорта: ${error.message}`);
  }
}

function printData() {
  window.print();
}