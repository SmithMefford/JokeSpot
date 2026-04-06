console.log("script.js loaded");

(() => {
  'use strict';

  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const passwordInput = document.getElementById("regPassword");
  const form = document.getElementById("register");

  if (passwordInput) {
    passwordInput.classList.remove('is-valid', 'is-invalid');

    passwordInput.addEventListener('input', function () {
      if (this.value === '') {
        this.classList.remove('is-valid', 'is-invalid');
      } else if (pattern.test(this.value)) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
      } else {
        this.classList.remove('is-valid');
        this.classList.add('is-invalid');
      }
    });
  }

  if (form && passwordInput) {
    form.addEventListener("submit", event => {
      event.preventDefault();

      const usernameValid = document.getElementById("username").value.trim() !== '';
      const passwordValid = pattern.test(passwordInput.value);

      if (!passwordValid) {
        passwordInput.classList.remove('is-valid');
        passwordInput.classList.add('is-invalid');
      }

      if (!usernameValid || !passwordValid) {
        event.stopPropagation();
        return;
      }

      form.submit();
    });
  }

})();

// Allows to call api routes without refreshing the page  
document.addEventListener("submit", async (event) => {
  console.log(event.target.id)
  if (event.target.id === "rateJoke") {
    event.preventDefault();
  
    const rating = event.submitter.value
    const res = await fetch('/rateJoke', {
      method: 'POST', 
      headers: { 'Content-Type' : 'application/json' },
      body: JSON.stringify({ data : rating})
    });
  } else if (event.target.id === "loadJokes") {
    event.preventDefault();

    for (let i = 0; i < 6; i++) {
      const res = await fetch('/loadJokes');
      const post = await res.text();
      document.getElementById('feedBox').innerHTML += post;
    }
  }
});