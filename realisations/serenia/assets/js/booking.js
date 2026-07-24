// Cliniva Dentaire — logique du formulaire de prise de rendez-vous
//
// Canal unique : un e-mail est envoye au cabinet via EmailJS des que le
// formulaire est valide, sans backend ni serveur dedie.
//
// CONFIGURATION REQUISE avant mise en ligne :
// 1) Creer un compte gratuit sur https://www.emailjs.com (200 e-mails/mois gratuits)
// 2) Ajouter un "Email Service" (Gmail par ex.) -> recuperer le SERVICE_ID
// 3) Creer un "Email Template" avec les variables {{patient_name}}, {{patient_email}},
//    {{department}}, {{date}}, {{message}} -> recuperer le TEMPLATE_ID
// 4) Recuperer la "Public Key" dans Account > General
// 5) Remplacer les 3 valeurs ci-dessous.

var EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
var EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';
var EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';

var CLINIC_PHONE_DISPLAY = '01 47 25 63 89'; // numero fictif de demo
var CLINIC_PHONE_TEL = '+33147256389';

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  if (window.emailjs && EMAILJS_PUBLIC_KEY.indexOf('YOUR_') !== 0) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    handleBookingSubmit(form);
  });
});

function handleBookingSubmit(form) {
  var data = {
    patient_name: form.name.value.trim(),
    patient_lastname: form.lastname.value.trim(),
    patient_email: form.email.value.trim(),
    patient_phone: form.phone.value.trim(),
    department: form.department.value || 'Non precise',
    date: form.date.value,
    time: form.time.value,
    message: form.message.value.trim() || '—'
  };

  clearFormAlerts();
  setSubmitLoading(form, true);

  sendBookingEmail(data)
    .then(function () { showConfirmation(true); })
    .catch(function () { showConfirmation(false); })
    .finally(function () {
      setSubmitLoading(form, false);
      form.reset();
    });
}

function sendBookingEmail(data) {
  var isConfigured =
    window.emailjs &&
    EMAILJS_PUBLIC_KEY.indexOf('YOUR_') !== 0 &&
    EMAILJS_SERVICE_ID.indexOf('YOUR_') !== 0 &&
    EMAILJS_TEMPLATE_ID.indexOf('YOUR_') !== 0;

  if (!isConfigured) return Promise.reject(new Error('EmailJS non configure'));
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, data);
}

function showConfirmation(emailSent) {
  var confirmation = document.getElementById('booking-confirmation');
  if (!confirmation) return;

  var statusEl = confirmation.querySelector('.form-success, .form-error');
  var callLine = confirmation.querySelector('.booking-call-line');

  if (statusEl) {
    statusEl.className = emailSent ? 'form-success' : 'form-error';
    statusEl.textContent = emailSent
      ? 'Votre demande a ete envoyee par e-mail au cabinet. Nous revenons vers vous rapidement.'
      : 'Votre demande n\'a pas pu etre transmise automatiquement. Merci d\'appeler directement le cabinet :';
  }
  if (callLine) callLine.classList.toggle('hidden', emailSent);

  confirmation.classList.remove('hidden');
  confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearFormAlerts() {
  var confirmation = document.getElementById('booking-confirmation');
  if (confirmation) confirmation.classList.add('hidden');
}

function setSubmitLoading(form, isLoading) {
  var button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Envoi en cours…' : 'Prendre rendez-vous';
}
