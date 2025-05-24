// === App Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded'); // Debug line

  const form = document.getElementById('workout-form');
  const exerciseInput = document.getElementById('exercise');
  const repsInput = document.getElementById('reps');
  const workoutList = document.getElementById('workout-list');
  const chartCanvas = document.getElementById('workoutChart');
  const themeToggle = document.getElementById('themeToggle');
  let workoutChart = null;

  // === Theme Toggle Logic ===
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // === Export Button Setup ===
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export to CSV';
  exportBtn.style.marginBottom = '15px';
  exportBtn.style.padding = '10px';
  exportBtn.style.border = 'none';
  exportBtn.style.backgroundColor = '#007bff';
  exportBtn.style.color = 'white';
  exportBtn.style.borderRadius = '5px';
  exportBtn.style.cursor = 'pointer';
  workoutList.before(exportBtn);

  let savedWorkouts = JSON.parse(localStorage.getItem('workouts')) || [];
  savedWorkouts.sort((a, b) => b.id - a.id);
  savedWorkouts.forEach(addWorkoutToDOM);
  updateChart(savedWorkouts);

  // === Add Workout ===
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    console.log('Form submitted'); // Debug line

    const exercise = exerciseInput.value.trim();
    const reps = repsInput.value.trim();

    if (!exercise || !reps) return;

    const workout = {
      id: Date.now(),
      exercise,
      reps,
      createdAt: new Date().toISOString()
    };

    savedWorkouts.unshift(workout);
    localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
    addWorkoutToDOM(workout);
    updateChart(savedWorkouts);

    exerciseInput.value = '';
    repsInput.value = '';
  });

  // === Render Workout to DOM ===
  function addWorkoutToDOM(workout) {
    const li = document.createElement('li');
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';

    const formattedDate = new Date(workout.createdAt).toLocaleString();
    const text = document.createElement('span');
    text.textContent = `${workout.exercise} — ${workout.reps} reps (${formattedDate})`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✖';
    deleteBtn.style.background = 'red';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.padding = '5px 10px';
    deleteBtn.style.marginLeft = '10px';

    deleteBtn.addEventListener('click', () => {
      const confirmDelete = confirm('Are you sure you want to delete this workout?');
      if (!confirmDelete) return;

      workoutList.removeChild(li);
      savedWorkouts = savedWorkouts.filter(item => item.id !== workout.id);
      localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
      updateChart(savedWorkouts);
    });

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.style.background = 'orange';
    editBtn.style.color = 'white';
    editBtn.style.border = 'none';
    editBtn.style.borderRadius = '4px';
    editBtn.style.cursor = 'pointer';
    editBtn.style.padding = '5px 10px';
    editBtn.style.marginLeft = '10px';

    editBtn.addEventListener('click', () => {
      const exerciseField = document.createElement('input');
      const repsField = document.createElement('input');
      const saveBtn = document.createElement('button');

      exerciseField.type = 'text';
      exerciseField.value = workout.exercise;
      repsField.type = 'number';
      repsField.value = workout.reps;
      saveBtn.textContent = '💾 Save';

      saveBtn.style.background = 'green';
      saveBtn.style.color = 'white';
      saveBtn.style.border = 'none';
      saveBtn.style.borderRadius = '4px';
      saveBtn.style.cursor = 'pointer';
      saveBtn.style.padding = '5px 10px';
      saveBtn.style.marginLeft = '10px';

      container.innerHTML = '';
      container.style.gap = '10px';
      container.style.flexWrap = 'wrap';

      container.appendChild(exerciseField);
      container.appendChild(repsField);
      container.appendChild(saveBtn);

      saveBtn.addEventListener('click', () => {
        workout.exercise = exerciseField.value;
        workout.reps = repsField.value;
        localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
        updateChart(savedWorkouts);

        container.innerHTML = '';
        const updatedText = document.createElement('span');
        const updatedDate = new Date(workout.createdAt).toLocaleString();
        updatedText.textContent = `${workout.exercise} — ${workout.reps} reps (${updatedDate})`;

        container.appendChild(updatedText);
        container.appendChild(buttonWrapper);
      });
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.appendChild(editBtn);
    buttonWrapper.appendChild(deleteBtn);

    container.appendChild(text);
    container.appendChild(buttonWrapper);
    li.appendChild(container);
    workoutList.appendChild(li);
  }

  // === Export to CSV ===
  exportBtn.addEventListener('click', () => {
    if (savedWorkouts.length === 0) {
      alert('No workouts to export.');
      return;
    }

    const headers = ['Exercise', 'Reps', 'Date'];
    const rows = savedWorkouts.map(w => [
      w.exercise,
      w.reps,
      new Date(w.createdAt).toLocaleString()
    ]);

    let csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'workouts.csv';
    link.click();
  });

  // === Chart Update Function ===
  function updateChart(data) {
    const repsPerDay = {};

    data.forEach(workout => {
      const date = new Date(workout.createdAt).toLocaleDateString();
      repsPerDay[date] = (repsPerDay[date] || 0) + parseInt(workout.reps, 10);
    });

    const labels = Object.keys(repsPerDay);
    const reps = Object.values(repsPerDay);

    if (workoutChart) workoutChart.destroy();

    workoutChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Reps',
          data: reps,
          backgroundColor: '#4caf50'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Reps per Day' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
});
