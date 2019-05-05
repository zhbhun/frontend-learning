import React, { PureComponent } from 'react';

class Page extends PureComponent {
  static create = ({ path, title }) => PageWrappedComponent => {
    const PageWrapperComponent = props => (
      <Page>
        <PageWrappedComponent {...props} />
      </Page>
    );
    PageWrapperComponent.path = path;
    PageWrapperComponent.title = title;
    return PageWrapperComponent;
  };

  render() {
    return <div>{this.props.children}</div>;
  }
}

export default Page;
