var app = angular.module('app', ['ngRoute']);
app.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when('/list', {
      templateUrl: 'list.html',
      controller: 'RouteListCtl'
    })
    .when('/list/:id', {
      templateUrl: 'detail.html',
      controller: 'RouteDetailCtl'
    })
    .otherwise({
      redirectTo: '/list'
    });
}]);

app.controller('RouteListCtl', function ($scope) {
});

app.controller('RouteDetailCtl', function ($scope, $routeParams) {
  $scope.id = $routeParams.id;
});
