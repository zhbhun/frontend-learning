# 安装

## CDN

- jsDelivr：https://cdn.jsdelivr.net/npm/angular/angular.js
- npm：https://unpkg.com/angular/angular.js

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello Angularjs</title>
  </head>
  <body>
    <div ng-app="" ng-init="name='Angularjs'">
      <p>Name : <input type="text" ng-model="name" /></p>
      <h1>Hello {{name}}</h1>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/angular@1.8.0/angular.js"></script>
  </body>
</html>
```

## Scaffold

> https://github.com/gianarb/awesome-angularjs#seed-projects

- [NG6-starter](https://github.com/PatrickJS/NG6-starter)
