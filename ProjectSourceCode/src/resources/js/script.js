console.log("script.js loaded");
let jokes_loaded = 0;

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

  switch (e.name) {
    case "rateJoke":
      event.preventDefault();

      const formData1 = new FormData(e);
      const rateData = Object.fromEntries(formData1.entries())
      await fetch('/rateJoke', {
        method: 'POST', 
        headers: { 'Content-Type' : 'application/json' },
        body: JSON.stringify({ data : rateData})
      });
      break;
    case "loadJokes":
      event.preventDefault();
      loadJokes(5);
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
    case "postJoke":
        event.preventDefault();

        const joke = document.getElementById("jokeContent").value;
        const tags = document.getElementById("tags").value;

        const messageBox = document.getElementById("messageBox");

        try {  // needs to be worked on!!!
            const res = await fetch("/jokecreate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ jokeContent: joke, tags: tags })
            });

            if (res.ok) {
                messageBox.className = "alert alert-success mx-auto text-center rounded";
                messageBox.textContent = "Joke Posted!";
                
                // clear fields
                document.getElementById("jokeContent").value = "";
                document.getElementById("tags").value = "";
            } else {
                throw new Error();
            }

        } catch (err) {
            messageBox.className = "alert alert-danger mx-auto text-center rounded";
            messageBox.textContent = "Failed to post joke.";
        }

        messageBox.classList.remove("d-none");


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
      loadJokes(10)
  }
});

function switchInteraction(option) {
  const groupName = option.name;
  console.log(groupName);
  const interactions = document.getElementsByName(groupName);
  interactions.forEach((item) => {
    if (item !== option) item.checked = false;
  });

  option.form.requestSubmit();
}

async function loadJokes(amount) {
  for (let i = 0; i < amount; i++) {
    const res = await fetch('/loadJokes', {
      method: 'POST',
      headers: { 'Content-Type' : 'application/json' },
      body: JSON.stringify({ loaded : jokes_loaded})
    });
    const post = await res.text();
    document.getElementById('feedBox').innerHTML += post;
    jokes_loaded++;
    // console.log(jokes_loaded)
  }
}
