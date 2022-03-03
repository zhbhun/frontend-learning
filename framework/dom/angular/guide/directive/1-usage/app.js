angular.module('app', [])
  .controller('Ctrl', function ($scope) {
    $scope.customer = {
      name: 'Naomi',
      address: '1600 Amphitheatre'
    };
  })
  .directive('myCustomer', function () {
    return {
      template: 'Default(AE)，姓名: {{customer.name}} 地址: {{customer.address}}'
    };
  })
  .directive('myCustomerElement', function () {
    return {
      restrict: 'E',
      template: 'E，姓名: {{customer.name}} 地址: {{customer.address}}'
    };
  })
  .directive('myCustomerAttribute', function () {
    return {
      restrict: 'A',
      template: 'A，姓名: {{customer.name}} 地址: {{customer.address}}'
    };
  });
