# [react-fontawesome](https://github.com/FortAwesome/react-fontawesome)

## 安装

- `@fortawesome/fontawesome-svg-core`
- `@fortawesome/free-brands-svg-icons`
- `@fortawesome/free-regular-svg-icons`
- `@fortawesome/free-solid-svg-icons`
- `@fortawesome/react-fontawesome`

## 使用

- 动态图标导入

    ```ts
    import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
    import { solid, regular, brands } from '@fortawesome/fontawesome-svg-core/import.macro' // <-- import styles to be used

    <FontAwesomeIcon icon={solid('user-secret')} />
    <FontAwesomeIcon icon={regular('coffee')} />
    <FontAwesomeIcon icon={brands('twitter')} />
    ```

- 单独添加图标

    ```ts
    import ReactDOM from 'react-dom'
    import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
    import { faCoffee } from '@fortawesome/free-solid-svg-icons'
    
    const element = <FontAwesomeIcon icon={faCoffee} />
    
    ReactDOM.render(element, document.body)

    ```

- 全局添加图标

    ```ts
    import ReactDOM from 'react-dom'
    import { library } from '@fortawesome/fontawesome-svg-core'
    import { faAddressBook } from '@fortawesome/free-solid-svg-icons'

    library.add(faAddressBook)

    const element = <FontAwesomeIcon icon="fa-solid fa-address-book" />
    
    ReactDOM.render(element, document.body)
    ```

参考文献

- [Add Icons with React](https://fontawesome.com/docs/web/use-with/react/add-icons#add-some-style)

## 查找

https://fontawesome.com/search?m=free

- solid
- regular
- light
- thin
- duotone
- brands

## 样式

- [Adding Icon Styling with React](https://fontawesome.com/docs/web/use-with/react/style)
