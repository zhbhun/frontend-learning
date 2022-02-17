import React from 'react';
import Grid from 'react-bootstrap/es/Grid';
import Row from 'react-bootstrap/es/Row';
import Col from 'react-bootstrap/es/Col';
import Clearfix from 'react-bootstrap/es/Clearfix';
import Button from 'react-bootstrap/es/Button';
import ButtonToolbar from 'react-bootstrap/es/ButtonToolbar';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
      <hr/>
      <div>
        <h2>Layout</h2>
        <div>
          <h3>Basic Grid</h3>
          <Grid>
            <Row className="show-grid">
              <Col xs={12} md={8}>
                <code>{'<Col xs={12} md={8} />'};</code>
              </Col>
              <Col xs={6} md={4}>
                <code>{'<Col xs={6} md={4} />'}</code>
              </Col>
            </Row>

            <Row className="show-grid">
              <Col xs={6} md={4}>
                <code>{'<Col xs={6} md={4} />'}</code>
              </Col>
              <Col xs={6} md={4}>
                <code>{'<Col xs={6} md={4} />'}</code>
              </Col>
              <Col xsHidden md={4}>
                <code>{'<Col xsHidden md={4} />'}</code>
              </Col>
            </Row>

            <Row className="show-grid">
              <Col xs={6} xsOffset={6}>
                <code>{'<Col xs={6} xsOffset={6} />'}</code>
              </Col>
            </Row>

            <Row className="show-grid">
              <Col md={6} mdPush={6}>
                <code>{'<Col md={6} mdPush={6} />'}</code>
              </Col>
              <Col md={6} mdPull={6}>
                <code>{'<Col md={6} mdPull={6} />'}</code>
              </Col>
            </Row>
          </Grid>
        </div>
        <div>
          <h3>Clearfix</h3>
          <Grid>
            <Row className="show-grid">
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /&gt;
                </code>
                <br />
                {dummySentences.slice(0, 6).join(' ')}
              </Col>
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /&gt;
                </code>
                <br />
                {dummySentences.slice(0, 4).join(' ')}
              </Col>
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /&gt;
                </code>
                <br />
                {dummySentences.slice(0, 6).join(' ')}
              </Col>
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /&gt;
                </code>
                <br />
                {dummySentences.slice(0, 2).join(' ')}
              </Col>
            </Row>
          </Grid>
          <Grid>
            <Row className="show-grid">
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /">&gt;
                </code>
                <br />
                {dummySentences.slice(0, 6).join(' ')}
              </Col>
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /">&gt;
                </code>
                <br />
                {dummySentences.slice(0, 4).join(' ')}
              </Col>
              <Clearfix visibleSmBlock>
                <code>
                  &lt;
                  {'Clearfix visibleSmBlock'} /">&gt;
                </code>
              </Clearfix>
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /">&gt;
                </code>
                <br />
                {dummySentences.slice(0, 6).join(' ')}
              </Col>
              <Col sm={6} md={3}>
                <code>
                  &lt;
                  {'Col sm={6} md={3}'} /">&gt;
                </code>
                <br />
                {dummySentences.slice(0, 2).join(' ')}
              </Col>
            </Row>
          </Grid>
        </div>
      </div>
      <div>
        <h2>Button</h2>
        <div>
          <h3>Options</h3>
          <ButtonToolbar>
            {/* Standard button */}
            <Button>Default</Button>

            {/* Provides extra visual weight and identifies the primary action in a set of buttons */}
            <Button bsStyle="primary">Primary</Button>

            {/* Indicates a successful or positive action */}
            <Button bsStyle="success">Success</Button>

            {/* Contextual button for informational alert messages */}
            <Button bsStyle="info">Info</Button>

            {/* Indicates caution should be taken with this action */}
            <Button bsStyle="warning">Warning</Button>

            {/* Indicates a dangerous or potentially negative action */}
            <Button bsStyle="danger">Danger</Button>

            {/* Deemphasize a button by making it look like a link while maintaining button behavior */}
            <Button bsStyle="link">Link</Button>
          </ButtonToolbar>
        </div>
      </div>
    </div>
  );
}

const dummySentences = [
  'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.',
  'Donec hendrerit tempor tellus.',
  'Donec pretium posuere tellus.',
  'Proin quam nisl, tincidunt et, mattis eget, convallis nec, purus.',
  'Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
  'Nulla posuere.',
  'Donec vitae dolor.',
  'Nullam tristique diam non turpis.',
  'Cras placerat accumsan nulla.',
  'Nullam rutrum.',
  'Nam vestibulum accumsan nisl.'
];

export default App;
