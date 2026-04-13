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
  const e = event.target;
  //console.log(e)
  switch (e.id) {
    case "rateJoke":
      event.preventDefault();

      const rateData = new FormData(event.target);
      const rating = rateData.getAll('rate')[0];
      console.log(rating)
      await fetch('/rateJoke', {
        method: 'POST', 
        headers: { 'Content-Type' : 'application/json' },
        body: JSON.stringify({ data : rating})
      });
      break;
    case "loadJokes":
      event.preventDefault();

      for (let i = 0; i < 6; i++) {
        const res = await fetch('/loadJokes');
        const post = await res.text();
        document.getElementById('feedBox').innerHTML += post;
      }
      break;
    case "reportJoke":
      event.preventDefault();
      console.log("test")
      const formData = new FormData(e)
      const data = Object.fromEntries(formData.entries())
      const reportElement = e.parentElement.parentElement.parentElement; // The top of the modal
      const reportForm = bootstrap.Modal.getOrCreateInstance(reportElement);
      reportForm.hide(); // Hide the modal
      await fetch('/reportJoke', {
        method: 'POST', 
        headers: { 'Content-Type' : 'application/json' },
        body: JSON.stringify({ data : data})
      });


      break;
  }
  // if (event.target.id === "rateJoke") {
  //   event.preventDefault();
  
  //   const rating = event.submitter.value
  //   const res = await fetch('/rateJoke', {
  //     method: 'POST', 
  //     headers: { 'Content-Type' : 'application/json' },
  //     body: JSON.stringify({ data : rating})
  //   });
  // } else if (event.target.id === "loadJokes") {
  //   event.preventDefault();

  //   for (let i = 0; i < 6; i++) {
  //     const res = await fetch('/loadJokes');
  //     const post = await res.text();
  //     document.getElementById('feedBox').innerHTML += post;
  //   }
  // } 
});

// Check if a certain element was loaded
document.addEventListener("DOMContentLoaded", async () => {
    const target = document.getElementById("feed_page");
    if (target) {
      for (let i = 0; i < 9; i++) {
        const res = await fetch('/loadJokes');
        const post = await res.text();
        document.getElementById('feedBox').innerHTML += post;
      }
  }
});

function switchInteraction(option) {
  const groupName = option.name;
  const interactions = document.getElementsByName(groupName);
  interactions.forEach((item) => {
    if (item !== option) item.checked = false;
  });

  option.form.requestSubmit();
}
