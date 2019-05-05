import React from 'react';
import { Link } from 'react-router-dom';
import classes from './Example.module.scss';

const Crumb = ({ path }) => {
  if (typeof path !== 'string' || path === '/') return null;
  const paths = path.split('/');
  const urls = paths.reduce((rcc, item, index) => {
    if (index === paths.length - 1) {
      return rcc;
    }
    rcc.push(`${paths.slice(0, index).join('/')}/${item}`);
    return rcc;
  }, []);
  return (
    <ul className={classes.crumb}>
      {urls.map((url, index) => (
        <li key={index} className={classes.crumbItem}>
          <Link to={url}>{paths[index] || 'home'}</Link>
        </li>
      ))}
    </ul>
  );
};

const Example = ({ basePath = '', component: Component }) =>
  typeof Component === 'function' ? (
    <div>
      <div className={classes.title}>
        <div className={classes.titleContent}>{Component.title}</div>
        <Crumb path={basePath} />
      </div>
      <Component />
    </div>
  ) : (
    <div>
      <div className={classes.title}>
        <div className={classes.titleContent}>{Component.title}</div>
        <Crumb path={basePath} />
      </div>
      <ul>
        {(Component.routes || []).map((item, index) => {
          if (typeof item === 'string') {
            return (
              <li
                key={`${basePath !== '/' ? `${basePath}/` : basePath}${item}`}
                style={{ listStyle: 'none' }}
              >
                <strong>{item}</strong>
              </li>
            );
          }
          const { path, title } = item;
          return (
            <li key={`${basePath !== '/' ? `${basePath}/` : basePath}${path}`}>
              <Link to={`${basePath !== '/' ? `${basePath}/` : basePath}${path}`}>
                {title || path}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

export default Example;
