// База данных (JSON-сервер)
const API_URL = 'http://localhost:3001/patients';

// Загрузка пациентов
async function loadPatients() {
  try {
    const response = await fetch(API_URL);
    const patients = await response.json();
    const tableBody = document.querySelector("#patients-table tbody");
    tableBody.innerHTML = '';

    patients.forEach(patient => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${patient.name || '-'}</td>
        <td>${patient.birthDate || '-'}</td>
        <td>${calculateBMI(patient.height, patient.weight) || '-'}</td>
        <td>
          <button onclick="deletePatient(${patient.id})">Удалить</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Ошибка загрузки:', error);
  }
}

// Добавление пациента
document.getElementById("patient-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const patient = {
    name: document.getElementById("patient-name").value,
    birthDate: document.getElementById("patient-birthdate").value,
    height: parseFloat(document.getElementById("patient-height").value),
    weight: parseFloat(document.getElementById("patient-weight").value)
  };

  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });
    document.getElementById("patient-form").reset();
    loadPatients();
  } catch (error) {
    console.error('Ошибка добавления:', error);
  }
});

// Удаление пациента
window.deletePatient = async (id) => {
  if (confirm("Удалить пациента?")) {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      loadPatients();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  }
};

// Расчет ИМТ
function calculateBMI(height, weight) {
  if (!height || !weight) return null;
  return (weight / ((height / 100) ** 2)).toFixed(1);
}

// Печать данных
document.getElementById("print-btn").addEventListener("click", () => {
  window.print();
});

// Экспорт в Excel
document.getElementById("export-excel-btn").addEventListener("click", async () => {
  const response = await fetch(API_URL);
  const patients = await response.json();
  
  const data = patients.map(patient => ({
    'ФИО': patient.name,
    'Дата рождения': patient.birthDate,
    'Рост (см)': patient.height,
    'Вес (кг)': patient.weight,
    'ИМТ': calculateBMI(patient.height, patient.weight)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Пациенты");
  XLSX.writeFile(wb, "пациенты_АГ.xlsx");
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  loadPatients();
});