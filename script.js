
"use strict";

/* ==============================================
   FOCUS FIESTA — TASK MANAGEMENT
   ============================================== */

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

const totalCount = document.getElementById("total-count");
const activeCount = document.getElementById("active-count");
const completedCount = document.getElementById("completed-count");
const allCount = document.getElementById("all-count");

const progressValue = document.getElementById("progress-value");
const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");
const progressMessage = document.getElementById("progress-message");

const clearCompletedButton = document.getElementById("clear-completed");
const formMessage = document.getElementById("form-message");
const saveStatus = document.getElementById("save-status");
const emptyAddButton = document.getElementById("empty-add-button");

const celebration = document.getElementById("celebration");
const celebrationTitle = document.getElementById("celebration-title");
const celebrationMessage = document.getElementById("celebration-message");
const celebrationClose = document.getElementById("celebration-close");

const confettiCanvas = document.getElementById("confetti-canvas");
const ctx = confettiCanvas.getContext("2d");

const STORAGE_KEY = "focus-fiesta-tasks-v1";

let tasks = loadTasks();
let currentFilter = "all";
let celebrationTimeout = null;
let celebrationCount = 0;
let confettiPieces = [];
let animationFrame = null;
let previousCompletionCount = 0;

const CONFETTI_COLORS = [
    "#ff55c8",
    "#73f3ff",
    "#ffe77b",
    "#a982ff",
    "#83f5b5",
    "#ff975e",
    "#ffffff"
];

/* ==============================================
   1. LOCAL STORAGE
   ============================================== */

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(function (task) {
            return (
                task &&
                typeof task.id === "string" &&
                typeof task.text === "string" &&
                typeof task.completed === "boolean" &&
                typeof task.createdAt === "string"
            );
        });
    } catch (error) {
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        saveStatus.textContent = "SAVED LOCALLY";
    } catch (error) {
        saveStatus.textContent = "STORAGE UNAVAILABLE";
        showFormMessage(
            "Tasks could not be saved in this browser.",
            true
        );
    }
}

function createTaskId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}

/* ==============================================
   2. ADD TASKS
   ============================================== */

function addTask(text) {
    const cleanText = text.trim();

    if (!cleanText) {
        showFormMessage("Please enter a task first.", true);
        taskInput.focus();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        text: cleanText,
        completed: false,
        createdAt: new Date().toISOString()
    });

    saveTasks();
    renderTasks();

    taskInput.value = "";
    showFormMessage("Task added! One step closer. ✦");
    taskInput.focus();
}

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();
    addTask(taskInput.value);
});

emptyAddButton.addEventListener("click", function () {
    taskInput.focus();
    document.getElementById("tasks-section").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

function showFormMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("error", isError);
}

/* ==============================================
   3. COMPLETE / UNDO TASKS
   ============================================== */

function toggleTask(taskId) {
    const task = tasks.find(function (item) {
        return item.id === taskId;
    });

    if (!task) {
        return;
    }

    const wasCompleted = task.completed;

    if (wasCompleted) {
        task.completed = false;

        saveTasks();
        renderTasks();
        showFormMessage("Task reopened. You've got this!");

        return;
    }

    task.completed = true;

    saveTasks();
    renderTasks();

    const completed = tasks.filter(function (item) {
        return item.completed;
    }).length;

    const allDone =
        tasks.length > 0 &&
        completed === tasks.length;

    if (allDone) {
        celebrateAllTasks();
    } else {
        celebrateSingleTask();
    }
}

/* ==============================================
   4. DELETE TASKS
   ============================================== */

function deleteTask(taskId) {
    const task = tasks.find(function (item) {
        return item.id === taskId;
    });

    if (!task) {
        return;
    }

    tasks = tasks.filter(function (item) {
        return item.id !== taskId;
    });

    saveTasks();
    renderTasks();
    showFormMessage("Task removed from your list.");
}

/* Remove every completed task */

function clearCompletedTasks() {
    const completed = tasks.filter(function (task) {
        return task.completed;
    }).length;

    if (completed === 0) {
        return;
    }

    tasks = tasks.filter(function (task) {
        return !task.completed;
    });

    saveTasks();
    renderTasks();
    showFormMessage("Completed tasks cleared. Fresh space!");
}

clearCompletedButton.addEventListener(
    "click",
    clearCompletedTasks
);

/* ==============================================
   5. TASK FILTERS
   ============================================== */

document.querySelectorAll(".filter-button").forEach(function (button) {
    button.addEventListener("click", function () {
        currentFilter = button.dataset.filter;

        renderTasks();
    });
});

function getFilteredTasks() {
    if (currentFilter === "active") {
        return tasks.filter(function (task) {
            return !task.completed;
        });
    }

    if (currentFilter === "completed") {
        return tasks.filter(function (task) {
            return task.completed;
        });
    }

    return tasks;
}

/* ==============================================
   6. TASK DATE FORMATTING
   ============================================== */

function formatTaskDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "YOUR TASK";
    }

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).toUpperCase();
}

/* ==============================================
   7. RENDER TASKS AND PROGRESS
   ============================================== */

function renderTasks() {
    const completed = tasks.filter(function (task) {
        return task.completed;
    }).length;

    const active = tasks.length - completed;

    const percentage = tasks.length === 0
        ? 0
        : Math.round((completed / tasks.length) * 100);

    totalCount.textContent = tasks.length;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    allCount.textContent = tasks.length;

    progressValue.textContent = percentage + "%";
    progressFill.style.width = percentage + "%";

    progressTrack.setAttribute("aria-valuenow", percentage);

    clearCompletedButton.disabled = completed === 0;

    updateProgressMessage(percentage, tasks.length);

    document.querySelectorAll(".filter-button").forEach(function (button) {
        const isActive = button.dataset.filter === currentFilter;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    taskList.replaceChildren();

    const visibleTasks = getFilteredTasks();

    visibleTasks.forEach(function (task) {
        const item = document.createElement("li");

        item.className = "task-item" +
            (task.completed ? " completed" : "");

        /* Completion button */

        const checkButton = document.createElement("button");

        checkButton.type = "button";
        checkButton.className = "task-check";
        checkButton.setAttribute(
            "aria-label",
            task.completed
                ? "Mark task incomplete"
                : "Mark task complete"
        );
        checkButton.setAttribute(
            "aria-pressed",
            String(task.completed)
        );

        const checkmark = document.createElement("span");

        checkmark.textContent = task.completed ? "✓" : "";

        checkButton.appendChild(checkmark);

        checkButton.addEventListener("click", function () {
            toggleTask(task.id);
        });

        /* Task text and creation date */

        const content = document.createElement("div");
        content.className = "task-content";

        const text = document.createElement("p");
        text.className = "task-text";
        text.textContent = task.text;

        const meta = document.createElement("span");
        meta.className = "task-meta";
        meta.textContent = formatTaskDate(task.createdAt);

        content.append(text, meta);

        /* Delete button */

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete task";
        deleteButton.setAttribute(
            "aria-label",
            "Delete task: " + task.text
        );

        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        item.append(checkButton, content, deleteButton);

        taskList.appendChild(item);
    });

    taskList.hidden = visibleTasks.length === 0;
    emptyState.hidden = visibleTasks.length !== 0;

    updateEmptyState(active, completed);
}

function updateProgressMessage(percentage, total) {
    if (total === 0) {
        progressMessage.textContent = "Let's make the first move!";
    } else if (percentage === 100) {
        progressMessage.textContent = "Mission accomplished! You did it!";
    } else if (percentage >= 75) {
        progressMessage.textContent = "So close! Finish strong!";
    } else if (percentage >= 50) {
        progressMessage.textContent = "Halfway there. Keep that energy!";
    } else if (percentage > 0) {
        progressMessage.textContent = "Nice start. Keep the momentum!";
    } else {
        progressMessage.textContent = "Your next win is waiting!";
    }
}

function updateEmptyState(active, completed) {
    const heading = emptyState.querySelector("h3");
    const description = emptyState.querySelector("p");
    const button = document.getElementById("empty-add-button");

    if (tasks.length === 0) {
        heading.textContent = "Your next win starts here.";
        description.textContent =
            "Add your first task and turn your plans into progress.";
        button.hidden = false;
    } else if (currentFilter === "active" && active === 0) {
        heading.textContent = "Nothing left to do!";
        description.textContent =
            "Every task is completed. Enjoy your well-earned win.";
        button.hidden = false;
    } else if (currentFilter === "completed" && completed === 0) {
        heading.textContent = "Your victories are waiting.";
        description.textContent =
            "Complete a task to see it appear in this collection.";
        button.hidden = false;
    } else {
        heading.textContent = "Nothing to show.";
        description.textContent =
            "Try another filter to find your tasks.";
        button.hidden = false;
    }
}

/* ==============================================
   8. CELEBRATION POPUP
   ============================================== */

function showCelebration(isAllDone) {
    celebrationCount++;

    if (celebrationTimeout !== null) {
        clearTimeout(celebrationTimeout);
        celebrationTimeout = null;
    }

    if (isAllDone) {
        celebrationTitle.textContent = "YOU DID IT!";
        celebrationMessage.textContent =
            "Every task is complete! You turned your plans into action. " +
            "Take a moment to celebrate your amazing progress.";
        launchConfetti(240);
    } else {
        celebrationTitle.textContent = "Look at you go!";
        celebrationMessage.textContent =
            "One more task conquered! Keep collecting those little wins.";
        launchConfetti(105);
    }

    celebration.classList.add("show");
    celebration.setAttribute("aria-hidden", "false");
    celebrationClose.focus();

    // Auto-close after a while if the user doesn't dismiss it.
    celebrationTimeout = setTimeout(function () {
        closeCelebration();
    }, 5500);
}

function celebrateSingleTask() {
    showCelebration(false);
}

function celebrateAllTasks() {
    showCelebration(true);
}

function closeCelebration() {
    if (celebrationTimeout !== null) {
        clearTimeout(celebrationTimeout);
        celebrationTimeout = null;
    }

    celebration.classList.remove("show");
    celebration.setAttribute("aria-hidden", "true");

    if (taskInput) {
        taskInput.focus({ preventScroll: true });
    }
}

celebrationClose.addEventListener("click", closeCelebration);

celebration.addEventListener("click", function (event) {
    if (event.target === celebration) {
        closeCelebration();
    }
});

document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        celebration.classList.contains("show")
    ) {
        closeCelebration();
    }
});

/* ==============================================
   9. CONFETTI BURST ANIMATION
   Canvas-based; no external library required.
   ============================================== */

function resizeConfettiCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    confettiCanvas.width = Math.floor(window.innerWidth * ratio);
    confettiCanvas.height = Math.floor(window.innerHeight * ratio);

    confettiCanvas.style.width = window.innerWidth + "px";
    confettiCanvas.style.height = window.innerHeight + "px";

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener("resize", resizeConfettiCanvas);

resizeConfettiCanvas();

function launchConfetti(amount) {
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
        return;
    }

    resizeConfettiCanvas();

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Two colorful bursts, launched from different positions.
    const origins = [
        { x: width * 0.24, y: height * 0.34 },
        { x: width * 0.76, y: height * 0.34 }
    ];

    for (let i = 0; i < amount; i++) {
        const origin = origins[i % origins.length];
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;

        confettiPieces.push({
            x: origin.x,
            y: origin.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            gravity: 0.11 + Math.random() * 0.09,
            size: 4 + Math.random() * 7,
            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.25,
            color: CONFETTI_COLORS[
                Math.floor(Math.random() * CONFETTI_COLORS.length)
            ],
            shape: Math.random() > 0.5 ? "rect" : "circle",
            life: 1,
            decay: 0.003 + Math.random() * 0.003
        });
    }

    if (animationFrame === null) {
        animationFrame = requestAnimationFrame(animateConfetti);
    }
}

function animateConfetti() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const remaining = [];

    for (const piece of confettiPieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += piece.gravity;
        piece.vx *= 0.992;
        piece.rotation += piece.spin;
        piece.life -= piece.decay;

        if (
            piece.life <= 0 ||
            piece.y > window.innerHeight + 40
        ) {
            continue;
        }

        ctx.save();

        ctx.globalAlpha = Math.max(0, piece.life);
        ctx.fillStyle = piece.color;
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);

        if (piece.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(
                -piece.size / 2,
                -piece.size / 3,
                piece.size,
                piece.size * 0.65
            );
        }

        ctx.restore();

        remaining.push(piece);
    }

    confettiPieces = remaining;

    if (confettiPieces.length > 0) {
        animationFrame = requestAnimationFrame(animateConfetti);
    } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        animationFrame = null;
    }
}

/* ==============================================
   10. INITIALIZE THE APPLICATION
   ============================================== */

renderTasks();
