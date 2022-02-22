const { request } = require('express');
const express = require('express');
const { v4: uuidv4 } = require("uuid")
const app = express();
app.use(express.json());
const customers = [];

//Middleware for verification
function verifyifExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({ error: "Customer not found" });
  }
  //Here we return the data through request
  request.customer = customer;
  return next();
}

//Function to calculate financial datas
//There are two types of operations: Credit and Debit
function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

//Create an account 
app.post("/account", (request, response) => {
  const { cpf, name } = request.body;
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );
  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists" });
  }
  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });
  return response.status(201).send();
});

//Get a statement (extrato)
app.get("/statement", verifyifExistsAccountCPF, (request, response) => {
  const { customer } = request; // Here we get the data of middleware
  return response.json(customer.statement);
});

//Makes a deposit in an account
app.post("/deposit", verifyifExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  }
  customer.statement.push(statementOperation);
  return response.status(201).send();
});

//Makes a withdraw in an account (saque)
app.post("/withdraw", verifyifExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;
  const balance = getBalance(customer.statement);
  if (balance < amount) {
    return response.status(400).json({ error: "Insufficiente funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };
  customer.statement.push(statementOperation);
  return response.status(201).send();
});

//List a statement of an account 
app.get("/statement/date", verifyifExistsAccountCPF, (request, response) => {
  const { customer } = request; // Here we get the data of middleware
  const { date } = request.query;
  const dateFormat = new Date(date + " 00:00");
  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );
  return response.json(statement);
});

//Update s name of an account
app.put("/account", verifyifExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;
  customer.name = name;

  return response.status(201).send();
});

//Get the update method to show all datas
app.get("/account", verifyifExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer);
});

//Delete an account 
app.delete("/account", verifyifExistsAccountCPF, (request, response) => {
  const { customer } = request;
  customers.splice(customer, 1)

  return response.status(200).json(customers);
});

//Get balance of an account
app.get("/balance", verifyifExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const balance = getBalance(customer.statement);
  return response.json(balance);
});
app.listen(3333);