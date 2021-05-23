/** BizTime express application. */
const express = require("express");

const ExpressError = require("./expressError");

const companyRoutes = require("./routes/companies");
const invoiceRoutes = require("./routes/invoices");

const app = express();


app.use(express.json());

/** Company API Routes */
app.use('/companies',companyRoutes);

/** Invoice API Routes */
app.use('/invoices', invoiceRoutes);

/** 404 handler */
app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */
app.use((err, req, res, next) => {
  status = err.status || 500;

  if (process.env.NODE_ENV != 'test' || status == 500)
    console.error(err.stack);

  res.status(status);
  return res.json({
    error: err,
    message: err.message
  });
});


module.exports = app;
