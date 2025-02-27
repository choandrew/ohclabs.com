<script>
  function sendMail(event) {
    event.preventDefault(); // Prevent form submission

    // Get form values
    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let message = document.getElementById("message").value;

    // Construct the mailto link
    let mailtoLink = `mailto:hello@ohclabs.com?subject=New Contact Form Submission&body=Name: ${encodeURIComponent(name)}%0AEmail: ${encodeURIComponent(email)}%0A%0AMessage:%0A${encodeURIComponent(message)}`;

    // Open user's email client
    window.location.href = mailtoLink;
  }
</script>
