const express = require("express");
const db = require("../db");

const ExpressError = require("../expressError");

const router = express.Router();
const invoiceNotFoundError = new ExpressError('invoice not found', 404);

const resultNotPresent = pgResult => pgResult.rowCount === 0;

router.get('', async (req, res, next) => {
    try {
        const data = await db.query('SELECT id, comp_code, amt, paid FROM invoices');
        return res.json({ invoices: data.rows });
    } catch (e) {
        return next(e);
    }
});

router.get('/:id', async (req, res, next) => {
    const id = req.params.id;
    try {
        const invoiceData = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (resultNotPresent(invoiceData)) 
            return next(invoiceNotFoundError);
        else {
            const invoice = invoiceData.rows[0];
            const comp_code = invoice.comp_code;
            //we don't wan't the comp code in the result
            invoice.comp_code = undefined;
            const companyData = await db.query('SELECT * FROM companies WHERE code = $1', [comp_code]);
            
            invoice.company = companyData.rows[0];
            return res.json({ invoice });
        }
    } catch (e) {
        //handles the input not numeric error
        if(e.code === "22P02"){
            return next(invoiceNotFoundError);
        }
        return next(e);
    }
});


router.post('', async (req, res, next) => {

    const { comp_code, amt } = req.body;
    try {
        if (!comp_code || !amt){
            //If any of the inputs are empty, this should return a 400 status response.
            const e = new ExpressError('missing comp_code or amt', 400);
            return next(e);
        }

        const invoiceData = await db.query('INSERT INTO invoices (comp_code, amt) VALUES($1, $2) RETURNING *', [comp_code, amt]);
        const invoice = invoiceData.rows[0];
        res.status(201).json({invoice});
        
    } catch (e) {
        //handles the comp_code reference does not exist error
        if (e.code === '23503'){
            const e = new ExpressError('company not found', 404);
            next(e);
        }
        return next(e);
    }
});


router.put('/:id', async (req, res, next) =>{
    const id = req.params.id;
    const amt = req.body.amt;
    try{
        if(!amt){
            //handles no amt input
            const e = new ExpressError('missing amt', 400);
            return next(e);
        }
        const invoiceData = await db.query("UPDATE invoices SET amt = $1 WHERE id = $2 RETURNING *", [amt, id]);

        if (resultNotPresent(invoiceData))
            //handles no results 404
            return next(invoiceNotFoundError);
        else{
            const invoice = invoiceData.rows[0];
            return res.json({invoice})
        }
    } catch (e) {
        //handles the input not numeric error
        if (e.code === "22P02") {
            return next(invoiceNotFoundError);
        }
        return next(e);
    }
});



router.delete('/:id', async (req, res, next) =>{
    const id = req.params.id;
    try{
        const deleted = await db.query('DELETE FROM invoices WHERE id = $1', [id]);
        if(resultNotPresent(deleted))
            return next(invoiceNotFoundError);
        else{
            return res.json({status:'deleted'});
        }
    } catch (e) {
        //handles the input not numeric error
        if (e.code === "22P02") {
            return next(invoiceNotFoundError);
        }
        return next(e);
    }
});

module.exports = router;