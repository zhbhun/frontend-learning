var count  = 0;
document.addEventListener("turbolinks:load", function () {
  console.log('-->', ++count);
  console.log(0, location.href);
})
