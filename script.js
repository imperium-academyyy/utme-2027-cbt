/* =========================================================
   UTME 2027 CBT PLATFORM
   Static HTML + CSS + JavaScript + Supabase REST API
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

// Replace these two values with your actual Supabase details.

const SUPABASE_URL = "https://ereevzkqszauwewywyfy.supabase.co";
const SUPABASE_KEY = "sb_publishable_NH6GyCWYs7wTfsGTKaTK_w_BsiCsoaQ";


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

let candidate = null;
let attempt = null;

let selectedSubjects = [];

let questions = [];
let answers = {};

let currentQuestion = 0;

let examTimer = null;
let remainingSeconds = 0;


/* =========================================================
   3. SUPABASE REQUEST HELPER
   ========================================================= */

async function supabaseRequest(table, options = {}) {

  const url = `${SUPABASE_URL}/rest/v1/${table}`;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation"
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body
      ? JSON.stringify(options.body)
      : undefined
  });

  const text = await response.text();

  if (!response.ok) {

    console.error("SUPABASE ERROR:", text);

    throw new Error(
      text || "Supabase request failed."
    );
  }

  return text ? JSON.parse(text) : null;
}


/* =========================================================
   4. PAGE NAVIGATION
   ========================================================= */

function showPage(pageId) {

  const pages =
    document.querySelectorAll(".page");

  pages.forEach((page) => {
    page.classList.remove("active");
  });

  const page =
    document.getElementById(pageId);

  if (page) {
    page.classList.add("active");
  }

  window.scrollTo(0, 0);
}


/* =========================================================
   5. REGISTRATION
   ========================================================= */

const registrationForm =
  document.getElementById("registrationForm");

if (registrationForm) {
  registrationForm.addEventListener(
    "submit",
    registerCandidate
  );
}


async function registerCandidate(event) {

  event.preventDefault();

  const errorElement =
    document.getElementById("registerError");

  errorElement.textContent = "";

  const fullName =
    document
      .getElementById("fullName")
      .value
      .trim();

  const course =
    document
      .getElementById("course")
      .value
      .trim();

  const phone =
    document
      .getElementById("phone")
      .value
      .trim();

  const email =
    document
      .getElementById("email")
      .value
      .trim();


  /* -------------------------------------------------------
     VALIDATION
     ------------------------------------------------------- */

  if (
    !fullName ||
    !course ||
    !phone ||
    !email
  ) {

    errorElement.textContent =
      "Please complete all fields.";

    return;
  }


  /* -------------------------------------------------------
     BUTTON
     ------------------------------------------------------- */

  const button =
    registrationForm.querySelector(
      "button[type='submit']"
    );

  button.disabled = true;
  button.textContent = "Registering...";


  /* -------------------------------------------------------
     SUPABASE REGISTRATION
     ------------------------------------------------------- */

  try {

    const result =
      await supabaseRequest(
        "utme_candidates",
        {
          method: "POST",

          body: {
            full_name: fullName,
            course: course,
            phone: phone,
            email: email
          }
        }
      );


    /* -----------------------------------------------------
       CHECK RESULT
       ----------------------------------------------------- */

    if (
      !result ||
      !result.length
    ) {

      throw new Error(
        "Candidate registration failed. Supabase returned no candidate."
      );
    }


    /* -----------------------------------------------------
       SAVE CANDIDATE
       ----------------------------------------------------- */

    candidate = result[0];


    localStorage.setItem(
      "utme_candidate_id",
      candidate.id
    );

    localStorage.setItem(
      "utme_candidate_name",
      candidate.full_name
    );


    /* -----------------------------------------------------
       MOVE TO SUBJECT SELECTION
       ----------------------------------------------------- */

    prepareSubjectPage();

    showPage("subjectsPage");


  } catch (error) {

    /* -----------------------------------------------------
       IMPORTANT DEBUG UPDATE
       ----------------------------------------------------- */

    console.error(
      "REGISTRATION ERROR:",
      error
    );


    /*
       Instead of showing only:

       "Registration failed. Check your internet connection."

       we now show the actual Supabase error.
    */

    errorElement.textContent =
      error.message ||
      "Registration failed.";


  } finally {

    button.disabled = false;

    button.textContent =
      "Continue";
  }
}


/* =========================================================
   6. SUBJECT SELECTION
   ========================================================= */

const availableSubjects = [

  "English Language",

  "Mathematics",

  "Physics",

  "Chemistry",

  "Biology"

];


function prepareSubjectPage() {

  const container =
    document.getElementById(
      "subjectOptions"
    );

  if (!container) return;

  container.innerHTML = "";


  availableSubjects.forEach(
    (subject) => {

      const label =
        document.createElement("label");

      label.className =
        "subject-option";


      label.innerHTML = `
        <input
          type="checkbox"
          value="${subject}"
        >

        <span>
          ${subject}
        </span>
      `;


      container.appendChild(label);
    }
  );
}


function getSelectedSubjects() {

  const checkboxes =
    document.querySelectorAll(
      "#subjectOptions input[type='checkbox']:checked"
    );


  return Array.from(checkboxes)
    .map(
      (checkbox) =>
        checkbox.value
    );
}


function continueToInstructions() {

  selectedSubjects =
    getSelectedSubjects();


  const error =
    document.getElementById(
      "subjectError"
    );


  if (
    selectedSubjects.length === 0
  ) {

    if (error) {

      error.textContent =
        "Please select at least one subject.";
    }

    return;
  }


  if (error) {
    error.textContent = "";
  }


  showPage(
    "instructionsPage"
  );
}


/* =========================================================
   7. CREATE EXAM ATTEMPT
   ========================================================= */

async function startExam() {

  /* -------------------------------------------------------
     RECOVER CANDIDATE IF NECESSARY
     ------------------------------------------------------- */

  if (!candidate) {

    const candidateId =
      localStorage.getItem(
        "utme_candidate_id"
      );

    const candidateName =
      localStorage.getItem(
        "utme_candidate_name"
      );


    if (!candidateId) {

      showPage(
        "registerPage"
      );

      return;
    }


    candidate = {

      id: candidateId,

      full_name: candidateName

    };
  }


  try {

    /* -----------------------------------------------------
       CREATE ATTEMPT
       ----------------------------------------------------- */

    const result =
      await supabaseRequest(
        "utme_attempts",
        {

          method: "POST",

          body: {

            candidate_id:
              candidate.id,

            selected_subjects:
              selectedSubjects,

            total_questions: 0,

            status: "started"

          }

        }
      );


    if (
      !result ||
      !result.length
    ) {

      throw new Error(
        "Could not create exam attempt."
      );
    }


    attempt =
      result[0];


    /* -----------------------------------------------------
       LOAD QUESTIONS
       ----------------------------------------------------- */

    await loadQuestions();


    if (
      !questions.length
    ) {

      alert(
        "No questions were found for the selected subjects."
      );

      return;
    }


    /* -----------------------------------------------------
       TIMER
       ----------------------------------------------------- */

    /*
       1 minute per question.

       Example:
       180 questions = 180 minutes
    */

    remainingSeconds =
      questions.length * 60;


    currentQuestion = 0;

    answers = {};


    /* -----------------------------------------------------
       DISPLAY EXAM
       ----------------------------------------------------- */

    renderQuestion();

    renderQuestionPalette();

    startTimer();

    showPage(
      "examPage"
    );


  } catch (error) {

    console.error(
      "START EXAM ERROR:",
      error
    );


    alert(
      error.message ||
      "Unable to start the examination. Please try again."
    );
  }
}


/* =========================================================
   8. LOAD QUESTIONS
   ========================================================= */

async function loadQuestions() {

  questions = [];


  for (
    const subject of selectedSubjects
  ) {

    const encodedSubject =
      encodeURIComponent(
        subject
      );


    const url =
      `${SUPABASE_URL}/rest/v1/utme_questions` +
      `?subject=eq.${encodedSubject}` +
      `&select=id,subject,question,option_a,option_b,option_c,option_d,correct_answer,explanation`;


    const response =
      await fetch(
        url,
        {

          headers: {

            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`

          }

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        JSON.stringify(data)
      );
    }


    questions.push(
      ...data
    );
  }


  /* -------------------------------------------------------
     RANDOMIZE QUESTIONS
     ------------------------------------------------------- */

  questions =
    shuffleArray(
      questions
    );


  /* -------------------------------------------------------
     UPDATE ATTEMPT
     ------------------------------------------------------- */

  if (attempt) {

    await supabaseRequest(
      `utme_attempts?id=eq.${attempt.id}`,

      {

        method: "PATCH",

        body: {

          total_questions:
            questions.length

        }

      }
    );
  }
}


/* =========================================================
   9. SHUFFLE
   ========================================================= */

function shuffleArray(array) {

  const copy =
    [...array];


  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      copy[i],
      copy[j]
    ] =
    [
      copy[j],
      copy[i]
    ];
  }


  return copy;
}


/* =========================================================
   10. RENDER QUESTION
   ========================================================= */

function renderQuestion() {

  const question =
    questions[currentQuestion];


  if (!question) {
    return;
  }


  const number =
    document.getElementById(
      "questionNumber"
    );


  const subject =
    document.getElementById(
      "questionSubject"
    );


  const text =
    document.getElementById(
      "questionText"
    );


  /* -------------------------------------------------------
     QUESTION NUMBER
     ------------------------------------------------------- */

  if (number) {

    number.textContent =
      `Question ${currentQuestion + 1} of ${questions.length}`;
  }


  /* -------------------------------------------------------
     SUBJECT
     ------------------------------------------------------- */

  if (subject) {

    subject.textContent =
      question.subject;
  }


  /* -------------------------------------------------------
     QUESTION TEXT
     ------------------------------------------------------- */

  if (text) {

    text.textContent =
      question.question;
  }


  /* -------------------------------------------------------
     OPTIONS
     ------------------------------------------------------- */

  const options = {

    A: question.option_a,

    B: question.option_b,

    C: question.option_c,

    D: question.option_d

  };


  Object.entries(
    options
  ).forEach(
    ([letter, value]) => {

      const option =
        document.querySelector(
          `[data-option="${letter}"]`
        );


      if (!option) {
        return;
      }


      const textElement =
        option.querySelector(
          ".option-text"
        );


      if (textElement) {

        textElement.textContent =
          value;
      }


      option.classList.remove(
        "selected"
      );


      if (
        answers[question.id] ===
        letter
      ) {

        option.classList.add(
          "selected"
        );
      }
    }
  );


  updateNavigationButtons();

  updateQuestionPalette();
}


/* =========================================================
   11. SELECT ANSWER
   ========================================================= */

function selectAnswer(letter) {

  const question =
    questions[currentQuestion];


  if (!question) {
    return;
  }


  answers[question.id] =
    letter;


  renderQuestion();


  saveAnswer(
    question.id,
    letter
  );
}


/* =========================================================
   12. SAVE ANSWER
   ========================================================= */

async function saveAnswer(
  questionId,
  selectedAnswer
) {

  if (!attempt) {
    return;
  }


  try {

    await supabaseRequest(
      "utme_answers",

      {

        method: "POST",

        prefer:
          "resolution=merge-duplicates,return=representation",

        body: {

          attempt_id:
            attempt.id,

          question_id:
            questionId,

          selected_answer:
            selectedAnswer

        }

      }
    );


  } catch (error) {

    console.error(
      "COULD NOT SAVE ANSWER:",
      error
    );
  }
}


/* =========================================================
   13. NEXT QUESTION
   ========================================================= */

function nextQuestion() {

  if (
    currentQuestion <
    questions.length - 1
  ) {

    currentQuestion++;

    renderQuestion();
  }
}


/* =========================================================
   14. PREVIOUS QUESTION
   ========================================================= */

function previousQuestion() {

  if (
    currentQuestion > 0
  ) {

    currentQuestion--;

    renderQuestion();
  }
}


/* =========================================================
   15. QUESTION PALETTE
   ========================================================= */

function renderQuestionPalette() {

  const palette =
    document.getElementById(
      "questionPalette"
    );


  if (!palette) {
    return;
  }


  palette.innerHTML = "";


  questions.forEach(
    (question, index) => {

      const button =
        document.createElement(
          "button"
        );


      button.textContent =
        index + 1;


      button.className =
        "palette-number";


      if (
        index === currentQuestion
      ) {

        button.classList.add(
          "current"
        );
      }


      if (
        answers[question.id]
      ) {

        button.classList.add(
          "answered"
        );
      }


      button.onclick =
        () => {

          currentQuestion =
            index;

          renderQuestion();
        };


      palette.appendChild(
        button
      );
    }
  );
}


function updateQuestionPalette() {

  const buttons =
    document.querySelectorAll(
      ".palette-number"
    );


  buttons.forEach(
    (button, index) => {

      button.classList.toggle(
        "current",
        index === currentQuestion
      );


      const question =
        questions[index];


      button.classList.toggle(
        "answered",
        !!answers[
          question.id
        ]
      );
    }
  );
}


/* =========================================================
   16. NAVIGATION BUTTONS
   ========================================================= */

function updateNavigationButtons() {

  const previous =
    document.getElementById(
      "previousBtn"
    );


  const next =
    document.getElementById(
      "nextBtn"
    );


  if (previous) {

    previous.disabled =
      currentQuestion === 0;
  }


  if (next) {

    next.disabled =
      currentQuestion ===
      questions.length - 1;
  }
}


/* =========================================================
   17. TIMER
   ========================================================= */

function startTimer() {

  clearInterval(
    examTimer
  );


  updateTimerDisplay();


  examTimer =
    setInterval(
      () => {

        remainingSeconds--;


        updateTimerDisplay();


        if (
          remainingSeconds <= 0
        ) {

          clearInterval(
            examTimer
          );


          alert(
            "Time is up. Your examination will be submitted."
          );


          submitExam(true);
        }

      },
      1000
    );
}


/* =========================================================
   18. TIMER DISPLAY
   ========================================================= */

function updateTimerDisplay() {

  const timer =
    document.getElementById(
      "timer"
    );


  if (!timer) {
    return;
  }


  const minutes =
    Math.floor(
      remainingSeconds / 60
    );


  const seconds =
    remainingSeconds % 60;


  timer.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


  if (
    remainingSeconds <= 60
  ) {

    timer.classList.add(
      "danger"
    );

  } else {

    timer.classList.remove(
      "danger"
    );
  }
}


/* =========================================================
   19. SUBMIT EXAM
   ========================================================= */

async function submitExam(
  autoSubmit = false
) {

  clearInterval(
    examTimer
  );


  if (!attempt) {
    return;
  }


  /* -------------------------------------------------------
     CONFIRM SUBMISSION
     ------------------------------------------------------- */

  if (!autoSubmit) {

    const confirmed =
      confirm(
        "Are you sure you want to submit your examination?"
      );


    if (!confirmed) {

      startTimer();

      return;
    }
  }


  /* -------------------------------------------------------
     CALCULATE SCORE
     ------------------------------------------------------- */

  let score = 0;


  questions.forEach(
    (question) => {

      const selected =
        answers[
          question.id
        ];


      if (
        selected &&
        selected ===
          question.correct_answer
      ) {

        score++;
      }
    }
  );


  /* -------------------------------------------------------
     CALCULATE PERCENTAGE
     ------------------------------------------------------- */

  const percentage =
    questions.length
      ? (score / questions.length) * 100
      : 0;


  /* -------------------------------------------------------
     CALCULATE TIME USED
     ------------------------------------------------------- */

  const timeUsed =
    questions.length * 60 -
    remainingSeconds;


  /* -------------------------------------------------------
     SAVE RESULT
     ------------------------------------------------------- */

  try {

    await supabaseRequest(

      `utme_attempts?id=eq.${attempt.id}`,

      {

        method: "PATCH",

        body: {

          score: score,

          percentage:
            Number(
              percentage.toFixed(2)
            ),

          submitted_at:
            new Date().toISOString(),

          time_used_seconds:
            timeUsed,

          status:
            autoSubmit
              ? "expired"
              : "submitted"

        }

      }

    );


    /* -----------------------------------------------------
       SAVE RESULT LOCALLY
       ----------------------------------------------------- */

    localStorage.setItem(
      "utme_score",
      score
    );


    localStorage.setItem(
      "utme_percentage",
      percentage.toFixed(2)
    );


    localStorage.setItem(
      "utme_total",
      questions.length
    );


    /* -----------------------------------------------------
       DISPLAY RESULT
       ----------------------------------------------------- */

    displayResult(
      score,
      percentage,
      questions.length
    );


    showPage(
      "resultPage"
    );


  } catch (error) {

    console.error(
      "SUBMISSION ERROR:",
      error
    );


    alert(
      error.message ||
      "There was a problem submitting your examination."
    );
  }
}


/* =========================================================
   20. RESULT
   ========================================================= */

function displayResult(
  score,
  percentage,
  total
) {

  const scoreElement =
    document.getElementById(
      "resultScore"
    );


  const percentageElement =
    document.getElementById(
      "resultPercentage"
    );


  const totalElement =
    document.getElementById(
      "resultTotal"
    );


  if (scoreElement) {

    scoreElement.textContent =
      score;
  }


  if (percentageElement) {

    percentageElement.textContent =
      `${percentage.toFixed(2)}%`;
  }


  if (totalElement) {

    totalElement.textContent =
      total;
  }
}


/* =========================================================
   21. START OVER
   ========================================================= */

function startAgain() {

  candidate = null;

  attempt = null;

  selectedSubjects = [];

  questions = [];

  answers = {};

  currentQuestion = 0;


  clearInterval(
    examTimer
  );


  localStorage.removeItem(
    "utme_candidate_id"
  );


  localStorage.removeItem(
    "utme_candidate_name"
  );


  localStorage.removeItem(
    "utme_score"
  );


  localStorage.removeItem(
    "utme_percentage"
  );


  localStorage.removeItem(
    "utme_total"
  );


  showPage(
    "homePage"
  );
}


/* =========================================================
   22. INITIALIZE APPLICATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const candidateId =
      localStorage.getItem(
        "utme_candidate_id"
      );


    const candidateName =
      localStorage.getItem(
        "utme_candidate_name"
      );


    if (
      candidateId &&
      candidateName
    ) {

      candidate = {

        id: candidateId,

        full_name:
          candidateName

      };
    }
  }
);
