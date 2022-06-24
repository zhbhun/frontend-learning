
# TypeScript

## 小技巧

### 获取第三方组件未暴露的 props 类型

使用 react 提供的 ComponentProps 提取组件类型信息。

```ts
// Suppose there are no props for the Link component
import { Link } from 'react-router-dom'

// Use `React.ComponentProps` to get its props
type LinkProps = React.ComponentProps<typeof Link>

const ExtraLink: React.FC<LinkProps> = ({ to, ...props }) => (
 
  // To use
  <Link to={to || 'login'} {...props} />
)
```

### 定时器返回值类型

```ts
import type { FC } from 'react';
import { useEffect } from 'react';

const Example: FC = () => {
  
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])
  
  return null;
}
```

## 参考文献

- https://zh-hans.reactjs.org/docs/static-type-checking.html#typescript
- [Extremely Useful TypeScript and React Skills](https://javascript.plainenglish.io/super-useful-typescript-skills-eb35d049fdbd)
- [Using Typescript in React: a Crash Course](https://blog.openreplay.com/using-typescript-in-react-a-crash-course)
