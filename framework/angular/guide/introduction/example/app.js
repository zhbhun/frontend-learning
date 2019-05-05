angular.module('invoice', ['finance'])
  .controller('InvoiceController', ['currencyConverter', function (currencyConverter) {
    this.qty = 1;
    this.cost = 2;
    this.inCurr = 'EUR';
    this.currencies = currencyConverter.currencies;

    this.total = function total(outCurr) {
      return currencyConverter.convert(this.qty * this.cost, this.inCurr, outCurr);
    };
    this.pay = function pay() {
      window.alert("谢谢！");
    };
  }]);


angular.module('finance', [])
  .factory('currencyConverter', function () {
    var currencies = ['USD', 'EUR', 'CNY'],
      usdToForeignRates = {
        USD: 1,
        EUR: 0.74,
        CNY: 6.09
      };
    return {
      currencies: currencies,
      convert: convert
    };

    function convert(amount, inCurr, outCurr) {
      return amount * usdToForeignRates[outCurr] * 1 / usdToForeignRates[inCurr];
    }
  });
