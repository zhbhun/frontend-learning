```js
var oPrntWin = window.open("", "_blank",
"width=450,height=470,left=400,top=100,menubar=yes,toolbar=no,location=no,scrollbars=yes");
oPrntWin.document.open();
oPrntWin.document.write("<!doctype html><html><head><title>Print<\/title><\/head><body onload=\"print();\">" +
oDoc.innerHTML + "<\/body><\/html>");
oPrntWin.document.close();
```
