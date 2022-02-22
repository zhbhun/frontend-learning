/**
 * 测试 use State
 */
import React, {
  createContext,
  PureComponent,
  useCallback,
  useContext,
  useState,
} from 'react';
import Logger from '../../../Logger';
import Page from '../../../Page';

const ThemeContext = createContext('blue');

function Example() {
  const [theme, setTheme] = useState('blue');

  const handleChange = useCallback(event => {
    setTheme(event.target.value);
  }, []);

  return (
    <div>
      <select value={theme} onChange={handleChange}>
        <option value="blue">blue</option>
        <option value="red">red</option>
        <option value="green">green</option>
      </select>
      <ThemeContext.Provider value={theme}>
        <Child />
      </ThemeContext.Provider>
    </div>
  );
}

function Child() {
  const theme = useContext(ThemeContext);

  return <div style={{ width: 100, height: 100, backgroundColor: theme }} />;
}

export default Page.create({
  path: 'usecontext',
  title: 'Use Context',
})(Example);
