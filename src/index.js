const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;
  console.log("username", username);

  const userExist = users.find((user) => user.username === username);
  console.log(userExist);

  if (!userExist) {
    return response.status(404).json({ error: "User not found" });
  }

  request.user = userExist;

  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;

  // Should be able to let user create infinite new todos when is in Pro plan
  if (user.pro) {
    return next();
  }

  // Should not be able to let user create a new todo when is not Pro and already have ten todos
  // Should be able to let user create a new todo when is in free plan and have less than ten todos
  if (user.todos.length < 10) {
    return next();
  } else {
    return response
      .status(403)
      .json({ error: "User doesn't have pro plan or have more than 10 ToDos" });
  }
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  // User exists
  // Should not be able to put user and todo in request when user does not exists
  const userExist = users.find((user) => user.username === username);

  if (!userExist) {
    return response.status(404).json({ error: "User not found" });
  }

  // Id is UUID
  // Should not be able to put user and todo in request when todo id is not uuid
  if (!validate(id)) {
    return response.status(400).json({ error: "ID is not a valid UUID " });
  }

  // Id belongs to User in header
  const toDo = userExist.todos.find((todo) => todo.id === id);
  if (!toDo) {
    return response
      .status(404)
      .json({ error: "This ToDo doesnt belong to User" });
  }

  request.user = userExist;
  request.todo = toDo;

  return next();
}

function findUserById(request, response, next) {
  const { id } = request.params;

  const user = users.find((user) => user.id === id);

  if (!user) {
    return response.status(404).json({ error: "User not found" });
  }

  request.user = user;

  return next();
}

app.post("/users", (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get("/users/:id", findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch("/users/:id/pro", findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return response.json(user);
});

app.get("/todos", checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return response.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
