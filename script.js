/* =========================================
   FlowTask — Vanilla JS to-do app
   ========================================= */

// =========================================
// State & constants
// =========================================
const STORAGE_KEY = "flowtask_tasks";
const FILTERS = ["all", "active", "completed"];

let tasks = [];
let currentFilter = "all";
let draggedItem = null;

// =========================================
// DOM references
// =========================================
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const dueDate = document.getElementById("dueDate");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const filterBtns = document.querySelectorAll(".filter-btn");
const taskCount = document.getElementById("taskCount");
const clearCompletedBtn = document.getElementById("clearCompleted");
const themeToggle = document.getElementById("themeToggle");

// =========================================
// Utility functions
// =========================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  return due < today;
}

// =========================================
// Persistence
// =========================================
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      tasks = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load tasks:", e);
    tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("Failed to save tasks:", e);
  }
}

// =========================================
// Rendering
// =========================================
function render() {
  const filtered = tasks.filter(t => {
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  taskList.innerHTML = "";

  if (filtered.length === 0) {
    taskList.style.display = "none";
    emptyState.style.display = "flex";
  } else {
    taskList.style.display = "flex";
    emptyState.style.display = "none";
    filtered.forEach(task => taskList.appendChild(createTaskElement(task)));
  }

  updateCounter();
  updateClearButton();
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " completed" : "");
  li.dataset.id = task.id;
  li.draggable = true;

  const dueHtml = task.dueDate
    ? `<span class="due-date${isOverdue(task.dueDate) ? " overdue" : ""}">${formatDate(task.dueDate)}</span>`
    : "";

  li.innerHTML = `
    <div class="drag-handle" aria-label="Drag to reorder" title="Drag to reorder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <line x1="4" y1="9" x2="20" y2="9"/>
        <line x1="4" y1="15" x2="20" y2="15"/>
      </svg>
    </div>
    <button class="task-checkbox" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}" aria-pressed="${task.completed}">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
    <div class="task-content">
      <span class="task-title">${escapeHtml(task.title)}</span>
      <div class="task-meta">
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        ${dueHtml}
      </div>
    </div>
    <div class="task-actions">
      <button class="btn-icon btn-edit" aria-label="Edit task" title="Edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="btn-icon btn-delete" aria-label="Delete task" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  // Event listeners
  li.querySelector(".task-checkbox").addEventListener("click", () => toggleComplete(task.id));
  li.querySelector(".btn-delete").addEventListener("click", () => deleteTask(task.id));
  li.querySelector(".btn-edit").addEventListener("click", () => startEdit(task.id, li));

  // Drag and drop
  li.addEventListener("dragstart", handleDragStart);
  li.addEventListener("dragend", handleDragEnd);
  li.addEventListener("dragover", handleDragOver);
  li.addEventListener("drop", handleDrop);
  li.addEventListener("dragenter", handleDragEnter);
  li.addEventListener("dragleave", handleDragLeave);

  return li;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updateCounter() {
  const activeCount = tasks.filter(t => !t.completed).length;
  taskCount.textContent = `${activeCount} ${activeCount === 1 ? "task" : "tasks"} left`;
}

function updateClearButton() {
  const hasCompleted = tasks.some(t => t.completed);
  clearCompletedBtn.disabled = !hasCompleted;
}

// =========================================
// Task operations
// =========================================
function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;

  const task = {
    id: generateId(),
    title,
    completed: false,
    priority: prioritySelect.value,
    dueDate: dueDate.value || null,
    createdAt: Date.now()
  };

  tasks.unshift(task);
  saveTasks();
  render();

  taskInput.value = "";
  prioritySelect.value = "medium";
  dueDate.value = "";
  taskInput.focus();
}

function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function startEdit(id, li) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  li.classList.add("editing");
  const content = li.querySelector(".task-content");
  const actions = li.querySelector(".task-actions");

  const editHtml = `
    <input type="text" class="edit-input" value="${escapeHtml(task.title)}" aria-label="Edit task title" />
    <div class="edit-actions">
      <button class="btn-save" aria-label="Save">Save</button>
      <button class="btn-cancel" aria-label="Cancel">Cancel</button>
    </div>
  `;

  content.innerHTML = editHtml;
  actions.style.display = "none";

  const input = content.querySelector(".edit-input");
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const save = () => {
    const newTitle = input.value.trim();
    if (newTitle) {
      task.title = newTitle;
      saveTasks();
    }
    render();
  };

  const cancel = () => render();

  content.querySelector(".btn-save").addEventListener("click", save);
  content.querySelector(".btn-cancel").addEventListener("click", cancel);

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  });
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

// =========================================
// Drag and drop
// =========================================
function handleDragStart(e) {
  draggedItem = this;
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", this.dataset.id);
}

function handleDragEnd() {
  this.classList.remove("dragging");
  document.querySelectorAll(".task-item").forEach(item => item.classList.remove("drag-over"));
  draggedItem = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this !== draggedItem) {
    this.classList.add("drag-over");
  }
}

function handleDragLeave(e) {
  if (!this.contains(e.relatedTarget)) {
    this.classList.remove("drag-over");
  }
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove("drag-over");

  if (this === draggedItem) return;

  const draggedId = draggedItem.dataset.id;
  const targetId = this.dataset.id;

  const draggedIndex = tasks.findIndex(t => t.id === draggedId);
  const targetIndex = tasks.findIndex(t => t.id === targetId);

  if (draggedIndex !== -1 && targetIndex !== -1) {
    const [removed] = tasks.splice(draggedIndex, 1);
    tasks.splice(targetIndex, 0, removed);
    saveTasks();
    render();
  }
}

// =========================================
// Filters
// =========================================
function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  render();
}

// =========================================
// Theme
// =========================================
function initTheme() {
  const saved = localStorage.getItem("flowtask_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("flowtask_theme", next);
}

// =========================================
// Event listeners
// =========================================
addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addTask();
});

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

clearCompletedBtn.addEventListener("click", clearCompleted);

themeToggle.addEventListener("click", toggleTheme);

// =========================================
// Init
// =========================================
function init() {
  initTheme();
  loadTasks();
  render();
  taskInput.focus();
}

init();