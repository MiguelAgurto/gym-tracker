// === App Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('workout-form');
  const exerciseInput = document.getElementById('exercise');
  const repsInput = document.getElementById('reps');
  const weightInput = document.getElementById('weight');
  const typeSelect = document.getElementById('type');
  const workoutList = document.getElementById('workout-list');
  const chartCanvas = document.getElementById('workoutChart');
  const themeToggle = document.getElementById('themeToggle');
  const filterInput = document.getElementById('filterInput');
  const statsBox = document.getElementById('statsBox');
  const todaySessionStats = document.getElementById('todaySessionStats');
  const chartViewSelect = document.getElementById('chartViewSelect');

  const sortSelect = document.createElement('select');
  sortSelect.id = 'sortSelect';
  sortSelect.innerHTML = `
    <option value="newest">Sort by Newest</option>
    <option value="oldest">Sort by Oldest</option>
    <option value="reps">Sort by Most Reps</option>
    <option value="name">Sort by Exercise Name</option>
  `;
  filterInput.after(sortSelect);

  const typeFilterSelect = document.createElement('select');
  typeFilterSelect.id = 'typeFilter';
  typeFilterSelect.innerHTML = `
    <option value="">All Types</option>
    <option value="strength">💪 Strength</option>
    <option value="cardio">🏃 Cardio</option>
    <option value="stretch">🧘 Stretch</option>
  `;
  sortSelect.after(typeFilterSelect);

  let savedWorkouts = JSON.parse(localStorage.getItem('workouts')) || [];

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
  exportBtn.id = 'exportCSV';
  workoutList.before(exportBtn);

  let currentFilteredWorkouts = [...savedWorkouts]; // store filtered workouts globally

  renderWorkoutList(savedWorkouts);
  updateChart(savedWorkouts, chartViewSelect.value);
  updateStats(savedWorkouts);
  updateTodaySessionStats(savedWorkouts);

  // === Add Workout ===
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const exercise = exerciseInput.value.trim();
    const reps = repsInput.value.trim();
    const weight = weightInput.value.trim();
    const type = typeSelect.value;

    if (!exercise || !reps || !type) return;

    const workout = {
      id: Date.now(),
      exercise,
      reps,
      weight,
      type,
      createdAt: new Date().toISOString(),
      favorite: false
    };

    savedWorkouts.unshift(workout);
    localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
    currentFilteredWorkouts = [...savedWorkouts];
    renderWorkoutList(savedWorkouts);
    updateChart(savedWorkouts, chartViewSelect.value);
    updateStats(savedWorkouts);
    updateTodaySessionStats(savedWorkouts);

    exerciseInput.value = '';
    repsInput.value = '';
    weightInput.value = '';
    typeSelect.value = '';
  });

  // === Filters ===
  filterInput.addEventListener('input', updateFilteredView);
  typeFilterSelect.addEventListener('change', updateFilteredView);
  sortSelect.addEventListener('change', updateFilteredView);
  chartViewSelect.addEventListener('change', () => {
    updateChart(currentFilteredWorkouts, chartViewSelect.value);
  });

  function updateFilteredView() {
    let filtered = [...savedWorkouts];
    const search = filterInput.value.toLowerCase();
    const type = typeFilterSelect.value;
    const sort = sortSelect.value;

    if (search) {
      filtered = filtered.filter(w => w.exercise.toLowerCase().includes(search));
    }
    if (type) {
      filtered = filtered.filter(w => w.type === type);
    }
    if (sort === 'oldest') {
      filtered.sort((a, b) => a.id - b.id);
    } else if (sort === 'reps') {
      filtered.sort((a, b) => b.reps - a.reps);
    } else if (sort === 'name') {
      filtered.sort((a, b) => a.exercise.localeCompare(b.exercise));
    } else {
      filtered.sort((a, b) => b.id - a.id);
    }

    currentFilteredWorkouts = filtered;
    renderWorkoutList(filtered);
    updateChart(filtered, chartViewSelect.value);
    updateStats(filtered);
    updateTodaySessionStats(filtered);
  }

  // === Weekly Stats with Daily Session Stats ===
  function updateStats(data) {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const recent = data.filter(w => new Date(w.createdAt) > weekAgo);
    const totalReps = recent.reduce((sum, w) => sum + parseInt(w.reps, 10), 0);
    const totalWeight = recent.reduce((sum, w) => sum + (parseFloat(w.weight) || 0), 0);
    const sessionCount = recent.length;

    // Calculate unique session days in recent data (daily sessions)
    const sessionDays = new Set();
    recent.forEach(w => {
      sessionDays.add(new Date(w.createdAt).toLocaleDateString());
    });
    const dailySessions = sessionDays.size;

    const freq = {};
    recent.forEach(w => {
      freq[w.exercise] = (freq[w.exercise] || 0) + 1;
    });
    const mostFreq = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    statsBox.innerHTML = `
      <p><strong>Weekly Stats</strong></p>
      <p>Total Reps: ${totalReps}</p>
      <p>Total Weight: ${totalWeight.toFixed(1)} kg</p>
      <p>Sessions: ${sessionCount}</p>
      <p>Daily Sessions: ${dailySessions}</p>
      <p>Most Frequent: ${mostFreq}</p>
    `;
  }

  // === Today's Session Stats ===
  function updateTodaySessionStats(data) {
    const today = new Date().toLocaleDateString();

    // Filter workouts for today only
    const todayWorkouts = data.filter(w => {
      return new Date(w.createdAt).toLocaleDateString() === today;
    });

    // Calculate total reps today
    const totalReps = todayWorkouts.reduce((sum, w) => sum + parseInt(w.reps, 10), 0);

    // Count distinct exercise types today
    const exerciseTypes = new Set(todayWorkouts.map(w => w.exercise.toLowerCase()));
    const typeCount = exerciseTypes.size;

    // Find start and finish time of today’s session
    if (todayWorkouts.length > 0) {
      const times = todayWorkouts.map(w => new Date(w.createdAt));
      const startTime = new Date(Math.min(...times));
      const finishTime = new Date(Math.max(...times));

      document.getElementById('todayReps').textContent = `Total Reps: ${totalReps}`;
      document.getElementById('todayTypes').textContent = `Exercise Types: ${typeCount}`;
      document.getElementById('sessionTime').textContent = 
        `Session Time: ${startTime.toLocaleTimeString()} - ${finishTime.toLocaleTimeString()}`;
    } else {
      document.getElementById('todayReps').textContent = 'Total Reps: 0';
      document.getElementById('todayTypes').textContent = 'Exercise Types: 0';
      document.getElementById('sessionTime').textContent = 'Session Time: -';
    }
  }

  // === Render Workout List ===
  function renderWorkoutList(data) {
    workoutList.innerHTML = '';
    data.forEach(addWorkoutToDOM);
  }

  function addWorkoutToDOM(workout) {
    const li = document.createElement('li');
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';

    const formattedDate = new Date(workout.createdAt).toLocaleString();
    const emoji = { strength: '💪', cardio: '🏃', stretch: '🧘' }[workout.type] || '';
    const weightText = workout.weight ? ` at ${workout.weight} kg` : '';
    const text = document.createElement('span');
    text.textContent = `${emoji} ${workout.exercise} — ${workout.reps} reps${weightText} (${formattedDate})`;

    const favBtn = document.createElement('button');
    favBtn.textContent = workout.favorite ? '⭐' : '☆';
    favBtn.className = 'favorite';
    favBtn.onclick = () => {
      workout.favorite = !workout.favorite;
      localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
      renderWorkoutList(savedWorkouts);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✖';
    deleteBtn.className = 'delete';
    deleteBtn.onclick = () => {
      if (confirm('Delete this workout?')) {
        savedWorkouts = savedWorkouts.filter(item => item.id !== workout.id);
        localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
        renderWorkoutList(savedWorkouts);
        updateChart(savedWorkouts, chartViewSelect.value);
        updateStats(savedWorkouts);
        updateTodaySessionStats(savedWorkouts);
      }
    };

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.className = 'edit';
    editBtn.onclick = () => {
      const exerciseField = document.createElement('input');
      const repsField = document.createElement('input');
      const weightField = document.createElement('input');
      const typeField = document.createElement('select');
      const saveBtn = document.createElement('button');

      exerciseField.type = 'text';
      exerciseField.value = workout.exercise;
      repsField.type = 'number';
      repsField.value = workout.reps;
      weightField.type = 'number';
      weightField.value = workout.weight || '';
      typeField.innerHTML = `
        <option value="">Select type</option>
        <option value="strength">💪 Strength</option>
        <option value="cardio">🏃 Cardio</option>
        <option value="stretch">🧘 Stretch</option>
      `;
      typeField.value = workout.type;

      saveBtn.textContent = '💾 Save';
      saveBtn.className = 'edit';

      container.innerHTML = '';
      container.style.gap = '10px';
      container.style.flexWrap = 'wrap';

      container.appendChild(exerciseField);
      container.appendChild(repsField);
      container.appendChild(weightField);
      container.appendChild(typeField);
      container.appendChild(saveBtn);

      saveBtn.addEventListener('click', () => {
        workout.exercise = exerciseField.value;
        workout.reps = repsField.value;
        workout.weight = weightField.value;
        workout.type = typeField.value;
        localStorage.setItem('workouts', JSON.stringify(savedWorkouts));
        updateChart(savedWorkouts, chartViewSelect.value);
        renderWorkoutList(savedWorkouts);
        updateStats(savedWorkouts);
        updateTodaySessionStats(savedWorkouts);
      });
    };

    const buttonWrapper = document.createElement('div');
    buttonWrapper.appendChild(favBtn);
    buttonWrapper.appendChild(editBtn);
    buttonWrapper.appendChild(deleteBtn);

    container.appendChild(text);
    container.appendChild(buttonWrapper);
    li.appendChild(container);
    workoutList.appendChild(li);
  }

  exportBtn.addEventListener('click', () => {
    if (!savedWorkouts.length) return;
    const headers = ['Exercise', 'Reps', 'Weight', 'Type', 'Date'];
    const rows = savedWorkouts.map(w => [
      w.exercise,
      w.reps,
      w.weight || '',
      w.type,
      new Date(w.createdAt).toLocaleString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'workouts.csv';
    link.click();
  });

  function updateChart(data, view = 'reps') {
    let filteredData = data;

    // Filter by exercise type if view is one of those
    if (['strength', 'cardio', 'stretch'].includes(view)) {
      filteredData = data.filter(w => w.type === view);
      view = 'reps'; // Show reps for these filtered types
    }

    // Aggregate data by day
    const aggData = {};
    filteredData.forEach(w => {
      const date = new Date(w.createdAt).toLocaleDateString();
      if (view === 'weight') {
        aggData[date] = (aggData[date] || 0) + (parseFloat(w.weight) || 0);
      } else {
        // default to reps count
        aggData[date] = (aggData[date] || 0) + parseInt(w.reps, 10);
      }
    });

    const labels = Object.keys(aggData);
    const values = Object.values(aggData);

    if (window.workoutChart instanceof Chart) {
      window.workoutChart.destroy();
    }

    window.workoutChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: view === 'weight' ? 'Total Weight (kg)' : 'Total Reps',
          data: values,
          backgroundColor: '#4caf50'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: `Workout Chart - ${view.charAt(0).toUpperCase() + view.slice(1)}` }
        },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Animate chart fade-in
    chartCanvas.classList.remove('chart-fade');
    void chartCanvas.offsetWidth; // Trigger reflow for animation restart
    chartCanvas.classList.add('chart-fade');
  }
});
