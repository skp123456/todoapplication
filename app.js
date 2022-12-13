const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(process.env.PORT || 3000, () => {
      console.log("Server is Running");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasStatusProperty = (requestQueryObj) => {
  return requestQueryObj.status !== undefined;
};

const hasPriorityProperty = (requestQueryObj) => {
  return requestQueryObj.priority !== undefined;
};

const hasStatusAndPriorityProperty = (requestQueryObj) => {
  return (
    requestQueryObj.priority !== undefined &&
    requestQueryObj.status !== undefined
  );
};

const hasStatusAndCategoryProperty = (requestQueryObj) => {
  return (
    requestQueryObj.status !== undefined &&
    requestQueryObj.category !== undefined
  );
};

const hasCategoryProperty = (requestQueryObj) => {
  return requestQueryObj.category !== undefined;
};

const hasCategoryAndPriorityProperty = (requestQueryObj) => {
  return (
    requestQueryObj.category !== undefined &&
    requestQueryObj.priority !== undefined
  );
};

const convertDBObjToResponseOBj = (dbObj) => {
  return {
    id: dbObj.id,
    todo: dbObj.todo,
    priority: dbObj.priority,
    status: dbObj.status,
    category: dbObj.category,
    dueDate: dbObj.due_date,
  };
};

//Get todo list API

app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q = "" } = request.query;
  let getTodoListQuery = "";

  switch (true) {
    case hasStatusProperty(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTodoListQuery = `
                SELECT *
                FROM todo
                WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}'
            `;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        getTodoListQuery = `
                SELECT *
                FROM todo
                WHERE 
                todo LIKE '%${search_q}%'
                AND priority = '${priority}';
            `;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusAndPriorityProperty(request.query):
      getTodoListQuery = `
            SELECT *
            FROM todo
            WHERE
            todo LIKE '%${search_q}%'
            AND status = '${status}'
            AND priority = '${priority}';
          `;

      break;
    case hasStatusAndCategoryProperty(request.query):
      getTodoListQuery = `
            SELECT *
            FROM todo
            WHERE
            todo LIKE '%${search_q}%'
            AND status = '${status}'
            AND category = '${category}';
        `;
      break;
    case hasCategoryProperty(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        getTodoListQuery = `
                SELECT *
                FROM todo
                WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}';
            `;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodoListQuery = `
            SELECT *
            FROM todo
            WHERE
            todo LIKE '%${search_q}%'
            AND category = '${category}'
            AND priority = '${priority}';
        `;
    default:
      getTodoListQuery = `
            SELECT *
            FROM todo
            WHERE 
            todo LIKE '%${search_q}%';
         `;
  }
  if (getTodoListQuery !== "") {
    const todoList = await db.all(getTodoListQuery);
    response.send(
      todoList.map((eachTodoObj) => convertDBObjToResponseOBj(eachTodoObj))
    );
  }
});

//Get todo API

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT *
        FROM todo
        WHERE
        id = ${todoId};
    `;
  const todo = await db.get(getTodoQuery);
  response.send(convertDBObjToResponseOBj(todo));
});

//Get todo by date

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const isValidDate = isValid(new Date(date));
  if (isValidDate === true) {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQueryDate = `
        SELECT *
        FROM todo
        WHERE
        due_date = '${formattedDate}';
    `;
    const todoList = await db.all(getTodoQueryDate);
    response.send(
      todoList.map((eachTodoObj) => convertDBObjToResponseOBj(eachTodoObj))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//Add todo API

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;

  const isDateValid = isValid(new Date(dueDate));

  if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category !== "HOME" &&
    category !== "WORK" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    if (isDateValid === true) {
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const addTodoQuery = `
            INSERT INTO todo
            (id,todo,priority,status,category,due_date)
            VALUES 
            (
                ${id},
                '${todo}',
                '${priority}',
                '${status}',
                '${category}',
                '${formattedDate}'
            );
          `;
      await db.run(addTodoQuery);
      response.send("Todo Successfully Added");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//Update todo API

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateColumn = "";

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `
        SELECT * 
        FROM todo
        WHERE
        id = ${todoId};
    `;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category !== "HOME" &&
    category !== "WORK" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const isValidDate = isValid(new Date(dueDate));
    if (isValidDate === true) {
      const newFormattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const updateTodoQuery = `
        UPDATE todo
        SET
        todo = '${todo}',
        priority = '${priority}',
        status = '${status}',
        category = '${category}',
        due_date = '${newFormattedDate}'
        WHERE
        id = ${todoId};
      `;
      await db.run(updateTodoQuery);
      response.send(`${updateColumn} Updated`);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//Delete todo API

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteToDoQuery = `
        DELETE from todo
        WHERE
        id = ${todoId};
    `;
  await db.run(deleteToDoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
