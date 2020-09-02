import React, { Component } from 'react';
import { computed, decorate, observable } from "mobx";
import { observer } from 'mobx-react';

class TodoList {
  todos = [
    new Todo(),
    new Todo(),
    new Todo(),
  ];
  get unfinishedTodoCount() {
      return this.todos.filter(todo => !todo.finished).length;
  }
}

decorate(TodoList, {
  todos: observable,
  unfinishedTodoCount: computed,
});

class Todo {
  id = Math.random();
  title = "";
  finished = false;
}

decorate(Todo, {
  title: observable,
  finished: observable
})

class TodoListView extends Component {
    render() {
        return <div>
            <ul>
                {this.props.todoList.todos.map(todo =>
                    <TodoView todo={todo} key={todo.id} />
                )}
            </ul>
            Tasks left: {this.props.todoList.unfinishedTodoCount}
            <hr />
            <ul>
                {this.props.todoList1.todos.map(todo =>
                    <TodoView todo={todo} key={todo.id} />
                )}
            </ul>
            Tasks left: {this.props.todoList1.unfinishedTodoCount}
        </div>
    }
}

const RCTodoListView = observer(TodoListView);

const TodoView = observer(({todo}) =>
    <li>
        <input
            type="checkbox"
            checked={todo.finished}
            onClick={() => todo.finished = !todo.finished}
        />{todo.title}
    </li>
)

const store = new TodoList();
const store1 = new TodoList();

function App() {
  return (
    <div className="App">
      <RCTodoListView todoList={store} todoList1={store1} />
    </div>
  );
}

export default App;
