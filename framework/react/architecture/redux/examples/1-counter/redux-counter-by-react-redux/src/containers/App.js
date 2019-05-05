import { connect } from 'react-redux';
import { increment, decrement } from '../actions';
import Counter from '../components/Counter';

const mapStateToProps = (state) => {
  return {
    value: state,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onIncrement: () => {
      dispatch(increment());
    },
    onDecrement: () => {
      dispatch(decrement());
    }
  }
};

const App = connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter);

export default App;
