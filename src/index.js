const { json, response } = require("express");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const getCustomerBalance = require("./helpers/get-customer-balance");

const app = express();
app.use(json());

const customers = [];

function hasCustomerWithCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(404).json({
      error: {
        message: "Customer does not exists.",
      },
    });
  }

  request.customer = customer;

  return next();
}

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({
      error: {
        message: "Customer already exists.",
      },
    });
  }

  const createdCustomer = {
    id: uuidv4(),
    cpf,
    name,
    statement: [],
  };

  customers.push(createdCustomer);

  return response.status(201).send();
});

app.get("/account/statement", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer.statement);
});

app.get("/account/statement/date", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const formattedDate = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) => statement.createdAt.toDateString() === new Date(formattedDate).toDateString()
  );

  if (!statement) {
    return response.status(404).json({
      error: {
        message: "Date not found.",
      },
    });
  }

  return response.status(200).json(statement);
});

app.post("/account/statement/deposit", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;
  const { description, amount } = request.body;

  customer.statement.push({
    description,
    amount,
    createdAt: new Date(),
    type: "credit",
  });

  return response.status(201).send();
});

app.post("/account/statement/withdraw", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;
  const { description, amount } = request.body;

  const balance = getCustomerBalance(customer?.statement);

  if (amount > balance) {
    return response.json({
      error: {
        message: "Insufficient amount.",
      },
    });
  }

  customer.statement.push({
    description,
    amount,
    createdAt: new Date(),
    type: "debit",
  });

  return response.status(201).send();
});

app.put("/account", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).send();
});

app.get("/accounts", (request, response) => {
  return response.status(200).json({ customers });
});

app.get("/account", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;

  return response.status(200).json({
    customerDetails: customer,
  });
});

app.get("/account/balance", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;

  return response.status(200).json(getCustomerBalance(customer.statement));
});

app.delete("/account", hasCustomerWithCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).send(customers);
});

app.listen(3333);
