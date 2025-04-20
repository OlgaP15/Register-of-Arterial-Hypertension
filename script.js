// Конфигурация
const API_URL = 'http://localhost:3001/patients';
const BMI_CATEGORIES = {
  underweight: { max: 18.5, class: 'underweight', label: 'Недостаток веса' },
  normal: { max: 25, class: 'normal', label: 'Норма' },
  overweight: { max: 30, class: 'overweight', label: 'Избыток веса' },
  obese: { max: Infinity, class: 'obese', label: 'Ожирение' }
};

// DOM элементы
const elements = {
  form: document.getElementById('patient-form'),
  table: document.getElementById('patients-table'),
  refreshBtn: document.getElementById('refresh-btn')
};

// Инициализация
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  await loadPatients();
  setupEventListeners();
}

function setupEventListeners() {
  elements.form.addEventListener('submit', handleFormSubmit);
  elements.refreshBtn.addEventListener('click', loadPatients);
  document.getElementById('print-btn').addEventListener('click', printData);
  document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
}

// Загрузка пациентов
async function loadPatients() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Ошибка загрузки');
    
    const patients = await response.json();
    renderPatients(patients);
  } catch (error) {
    showError(error.message);
  }
}

// Рендер списка пациентов
function renderPatients(patients) {
  const tbody = elements.table.querySelector('tbody');
  tbody.innerHTML = patients.map(patient => `
    <tr>
      <td>${patient.name || '-'}</td>
      <td>${formatDate(patient.birthDate)}</td>
      <td>${calculateBMI(patient.height, patient.weight)}</td>
      <td class="${getBMIClass(patient.height, patient.weight)}">
        ${getBMILabel(patient.height, patient.weight)}
      </td>
      <td>
        <button onclick="deletePatient(${patient.id})" class="danger-btn">Удалить</button>
      </td>
    </tr>
  `).join('');
}

// Обработка формы
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const patient = {
    name: document.getElementById('patient-name').value.trim(),
    birthDate: document.getElementById('patient-birthdate').value,
    height: parseFloat(document.getElementById('patient-height').value),
    weight: parseFloat(document.getElementById('patient-weight').value)
  };

  if (!patient.name) {
    showError('Введите ФИО пациента');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });

    if (!response.ok) throw new Error('Ошибка сохранения');
    
    elements.form.reset();
    await loadPatients();
  } catch (error) {
    showError(error.message);
  }
}

// Удаление пациента
window.deletePatient = async (id) => {
  if (!confirm('Вы уверены, что хотите удалить пациента?')) return;
  
  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Ошибка удаления');
    await loadPatients();
  } catch (error) {
    showError(error.message);
  }
};

// Вспомогательные функции
function calculateBMI(height, weight) {
  if (!height || !weight) return '-';
  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  return `${bmi} (${getBMILabel(height, weight)})`;
}

function getBMIClass(height, weight) {
  if (!height || !weight) return '';
  const bmi = weight / ((height / 100) ** 2);
  for (const [key, value] of Object.entries(BMI_CATEGORIES)) {
    if (bmi < value.max) return value.class;
  }
  return '';
}

function getBMILabel(height, weight) {
  if (!height || !weight) return '';
  const bmi = weight / ((height / 100) ** 2);
  for (const [key, value] of Object.entries(BMI_CATEGORIES)) {
    if (bmi < value.max) return value.label;
  }
  return '';
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
}

function showError(message) {
  alert(`Ошибка: ${message}`);
}

// Экспорт данных
async function exportToExcel() {
  try {
    const response = await fetch(API_URL);
    const patients = await response.json();
    
    const data = patients.map(patient => ({
      'ФИО': patient.name,
      'Дата рождения': formatDate(patient.birthDate),
      'Рост (см)': patient.height,
      'Вес (кг)': patient.weight,
      'ИМТ': calculateBMI(patient.height, patient.weight).split(' ')[0],
      'Категория ИМТ': getBMILabel(patient.height, patient.weight)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Пациенты");
    XLSX.writeFile(wb, "пациенты_АГ.xlsx");
  } catch (error) {
    showError(error.message);
  }
}

function printData() {
  window.print();
}