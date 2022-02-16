var input = document.querySelector('input');
var logs = document.querySelector('#logs');

input.addEventListener('input', function () {
  logs.innerHTML = input.value;
});
