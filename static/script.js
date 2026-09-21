/* ==========================================================
   SpamGuard AI — script.js
   Vanilla JavaScript. Talks to the FastAPI backend at /predict.

   What this file does:
   1. Settings
   2. Grab the page elements we need
   3. Small helper functions (counter, loading, errors, result)
   4. The main function that calls the API
   5. Event listeners (buttons, typing, examples)
   ========================================================== */


/* ---------- 1. Settings ---------- */

// A RELATIVE url on purpose: it works on localhost AND on Render
// without any change, because the page and the API share one domain.
const API_URL = "/predict";

const MAX_LENGTH = 500;        // must match maxlength in index.html
const NEAR_LIMIT_RATIO = 0.9;  // counter turns amber at 90% of the limit


/* ---------- 2. Page elements ---------- */

const messageInput  = document.getElementById("message-input");
const charCount     = document.getElementById("char-count");
const analyzeBtn    = document.getElementById("analyze-btn");
const analyzeLabel  = document.getElementById("analyze-label");
const clearBtn      = document.getElementById("clear-btn");

const errorBox      = document.getElementById("error-box");
const errorTitle    = document.getElementById("error-title");
const errorText     = document.getElementById("error-text");

const resultSection = document.getElementById("result-section");
const resultCard    = document.getElementById("result-card");
const resultTitle   = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");
const iconSpam      = document.getElementById("icon-spam");
const iconSafe      = document.getElementById("icon-safe");
const rawTextEl     = document.getElementById("raw-text");
const cleanedTextEl = document.getElementById("cleaned-text");
const announcer     = document.getElementById("sr-announcer");

const detectorSection = document.getElementById("detector");
const exampleButtons  = document.querySelectorAll(".example-card");

// Some people ask their device for less motion, so we respect that when scrolling
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";


/* ---------- 3. Helper functions ---------- */

// Updates the "0 / 500" counter
function updateCounter() {
  const length = messageInput.value.length;
  charCount.textContent = `${length} / ${MAX_LENGTH}`;
  charCount.classList.toggle("is-near-limit", length >= MAX_LENGTH * NEAR_LIMIT_RATIO);
}

// Turns the loading state on or off
function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;   // prevents double clicks
  clearBtn.disabled = isLoading;
  analyzeBtn.setAttribute("aria-busy", String(isLoading)); // CSS shows the spinner from this
  analyzeLabel.textContent = isLoading ? "Analyzing..." : "Analyze Message";
}

// Shows the friendly error box
function showError(title, message) {
  errorTitle.textContent = title;
  errorText.textContent = message;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
  messageInput.removeAttribute("aria-invalid");
}

function hideResult() {
  resultSection.hidden = true;
  announcer.textContent = "";
}

// Fills in and shows the result card
// data = { raw_text, cleaned_text, prediction } from the backend
function showResult(data, originalMessage) {
  // The backend returns exactly "Spam" or "Not Spam".
  // We compare the whole word, so "Not Spam" is never mistaken for "Spam".
  const isSpam = data.prediction.trim().toLowerCase() === "spam";

  // Switch the look (red/orange vs green) using CSS classes
  resultCard.classList.toggle("is-spam", isSpam);
  resultCard.classList.toggle("is-safe", !isSpam);
  iconSpam.hidden = !isSpam;
  iconSafe.hidden = isSpam;

  resultTitle.textContent = isSpam ? "Spam Detected" : "Not Spam";
  resultMessage.textContent = isSpam
    ? "This message appears to be spam."
    : "This message appears to be safe.";

  // textContent (not innerHTML) keeps user text from being treated as HTML
  rawTextEl.textContent = data.raw_text || originalMessage;

  const cleaned = (data.cleaned_text || "").trim();
  cleanedTextEl.textContent = cleaned || "Nothing was left after cleaning this message.";
  cleanedTextEl.classList.toggle("is-empty", !cleaned);

  // Show the card. The hidden attribute is removed, then we scroll to it.
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: scrollBehavior, block: "start" });

  // Let screen readers know the result
  announcer.textContent = `${resultTitle.textContent}. ${resultMessage.textContent}`;
}

// Turns any problem into a short, helpful message.
// Technical details go to the browser console, not to the user.
function handleError(error) {
  console.error("SpamGuard AI request failed:", error);

  if (error.status === 422) {
    showError(
      "We couldn't read that message",
      "Try rewording it, then select Analyze Message again."
    );
  } else if (error.status >= 500) {
    showError(
      "The server had a problem",
      "Your message was not analyzed. Wait a moment, then try again."
    );
  } else if (error.status) {
    showError(
      "Something went wrong",
      "The request could not be completed. Try again in a moment."
    );
  } else if (error instanceof TypeError) {
    // fetch() throws a TypeError when the network is down or the server is unreachable
    showError(
      "Can't reach the server",
      "Check your internet connection, then try again."
    );
  } else {
    showError(
      "Unexpected reply from the server",
      "The response was not in the expected format. Try again in a moment."
    );
  }
}


/* ---------- 4. Main function: send the message to the API ---------- */

async function analyzeMessage() {
  const message = messageInput.value.trim();

  hideError();
  hideResult();

  // Empty input check
  if (!message) {
    messageInput.setAttribute("aria-invalid", "true");
    showError("The message is empty", "Type or paste a message, then select Analyze Message.");
    messageInput.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: message
      })
    });

    // The server answered, but with an error code (422, 500, ...)
    if (!response.ok) {
      const httpError = new Error(`Request failed with status ${response.status}`);
      httpError.status = response.status;
      throw httpError;
    }

    const data = await response.json();

    // Make sure the reply looks the way we expect before using it
    if (!data || typeof data.prediction !== "string") {
      throw new Error("Response is missing the prediction field");
    }

    showResult(data, message);
  } catch (error) {
    handleError(error);
  } finally {
    // Runs whether the request worked or failed
    setLoading(false);
  }
}


/* ---------- 5. Event listeners ---------- */

// Update the counter and clear the "empty" warning while typing
messageInput.addEventListener("input", () => {
  updateCounter();
  if (messageInput.getAttribute("aria-invalid") === "true") {
    hideError();
  }
});

// Analyze button
analyzeBtn.addEventListener("click", analyzeMessage);

// Clear button: reset everything
clearBtn.addEventListener("click", () => {
  messageInput.value = "";
  updateCounter();
  hideError();
  hideResult();
  messageInput.focus();
});

// Example buttons: copy the example text into the textarea
exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const exampleText = button.querySelector(".example-text").textContent.trim();

    messageInput.value = exampleText;
    updateCounter();
    hideError();
    hideResult();

    // Bring the user back to the input box so they can press Analyze
    detectorSection.scrollIntoView({ behavior: scrollBehavior, block: "start" });
    messageInput.focus({ preventScroll: true });
  });
});

// Set the counter correctly when the page first loads
updateCounter();