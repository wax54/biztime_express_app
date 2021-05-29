/** BizTime express application. */
const express = require("express");

const ExpressError = require("./expressError");

const companyRoutes = require("./routes/companies");
const invoiceRoutes = require("./routes/invoices");
const industryRoutes = require("./routes/industries");

const app = express();


app.use(express.json());

/** Company API Routes */
app.use('/companies',companyRoutes);

/** Invoice API Routes */
app.use('/invoices', invoiceRoutes);

/** industry API Routes */
app.use('/industries', industryRoutes);

/** 404 handler */
app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */
app.use((err, req, res, next) => {
  status = err.status || 500;

  if (process.env.NODE_ENV != 'test')
    console.error(err.stack);
  if (status == 500)
    console.log(err);

  res.status(status);
  return res.json({
    error: err,
    message: err.message
  });
});


module.exports = app;
