// Quiz Questions Array
const quizData = [
    {
        question: "What does HTML stand for?",
        options: ["Hyper Text Markup Language", "High Text Machine Language", "Hyperlinks and Text Markup Language"],
        answer: 0
    },
    {
        question: "Which language is used for styling web pages?",
        options: ["HTML", "CSS", "Java"],
        answer: 1
    },
    {
        question: "Which language makes web pages interactive?",
        options: ["CSS", "HTML", "JavaScript"],
        answer: 2
    }
];

let currentQuestion = 0;
let score = 0;

const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const nextBtn = document.getElementById("nextBtn");
const resultBox = document.getElementById("result");
const scoreText = document.getElementById("scoreText");

// Load Question
function loadQuestion() {
    optionsEl.innerHTML = "";
    questionEl.innerText = quizData[currentQuestion].question;

    quizData[currentQuestion].options.forEach((option, index) => {
        const label = document.createElement("label");
        label.innerHTML = `
            <input type="radio" name="option" value="${index}">
            ${option}
        `;
        optionsEl.appendChild(label);
    });
}

// Next Button Click
nextBtn.addEventListener("click", () => {
    const selected = document.querySelector('input[name="option"]:checked');

    if (!selected) {
        alert("Please select an answer");
        return;
    }

    if (parseInt(selected.value) === quizData[currentQuestion].answer) {
        score++;
    }

    currentQuestion++;

    if (currentQuestion < quizData.length) {
        loadQuestion();
    } else {
        showResult();
    }
});

// Show Result
function showResult() {
    document.querySelector(".quiz-container").style.display = "none";
    resultBox.style.display = "block";

    let message = "Try Again!";
    if (score === quizData.length) {
        message = "Excellent!";
    } else if (score >= 2) {
        message = "Good Job!";
    }

    scoreText.innerText = `Your Score: ${score}/${quizData.length} - ${message}`;
}

// Restart Quiz
function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    resultBox.style.display = "none";
    document.querySelector(".quiz-container").style.display = "block";
    loadQuestion();
}

// Initial Load
loadQuestion();
