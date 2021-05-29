const express = require("express");
const slugify = require("slugify");
const db = require("../db");


const ExpressError = require("../expressError");

const router = express.Router();
const companyNotFoundError = new ExpressError('company not found', 404);


router.get('', async (req, res, next) =>{
    try {
        const data = await db.query('SELECT code, name FROM companies');
        return res.json({companies: data.rows});
    } catch (e) {
        return next(e);
    }
});

router.post('', async (req, res, next) => {

    const { name, description } = req.body;
    if (!name || !description) {
        //If any of the inputs are empty, this should return a 400 status response.
        const e = new ExpressError('missing name, or description', 400);
        return next(e);
    }
    const code = slugify(name, { lower: true });
    try {
        const data = await db.query(`INSERT INTO companies(code, name, description) VALUES ($1, $2, $3) RETURNING *`, [code, name, description]);
        return res.status(201).json({ company: data.rows[0] });
    } catch (e) {
        if (e.code == '23505'){
            //If the company already exists should return a 400 status response.
            const compExistsError = new ExpressError(`company named ${name} already exists with code ${code}`, 400);
            return next(compExistsError);
        } else {
            return next(e);
        }
    }
});

router.get('/:code', async (req, res, next) => {
    const comp_code = req.params.code;
    try{
        //Return obj of company: {company: {code, name, description}}
        const compData = await db.query(`
                        SELECT c.code, c.name, c.description, i.name as industries 
                        FROM companies AS c 
                        LEFT JOIN companies_industries AS c_i ON c.code = c_i.comp_code
                        LEFT JOIN industries AS i ON i.code = c_i.industry_code 
                        WHERE c.code = $1`, [comp_code]);
        
        if (compData.rows.length === 0) {
            //If the company given cannot be found, this should return a 404 status response.
            return next(companyNotFoundError);
        }
        const company = compData.rows[0];
        if(compData.rows[0].industries){
            company.industries = compData.rows.map( row => row.industries);
        } else { company.industries = []}

        const invoicesData = await db.query('SELECT * FROM invoices WHERE comp_code = $1', [comp_code]);
        const invoiceIds = invoicesData.rows.map(invoice => invoice.id);
        

        return res.json({company: {...company, invoices: invoiceIds}});
    } catch (e) {
        return next(e);
    }
});

router.put('/:code', async (req, res, next) => {

    const code = req.params.code
    const { name, description } = req.body;

    try {
        if (!code || !name || !description) {
            //If any of the inputs are empty, this should return a 400 status response.
            const e = new ExpressError('missing code, name, or description', 400);
            return next(e);
        }
        const data = await db.query(`UPDATE companies SET name = $2, description = $3 WHERE code = $1 RETURNING *`, [code, name, description]);
        if (data.rows.length == 0) {
            //If the company given cannot be found, this should return a 404 status response.
            return next(companyNotFoundError);
        }
        return res.json({ company: data.rows[0] });
    } catch (e) {
        return next(e);
    }
});

router.delete('/:code', async (req, res, next) =>{
    const code = req.params.code;
    try{
        const data = await db.query("DELETE FROM companies WHERE code = $1", [code]);
        if (data.rowCount === 0){
            return next(companyNotFoundError);
        }else{
            return res.json({status: "deleted"});
        }
    } catch (e) {

        return next(e);
    }
});


router.post('/:code/add_industry', async (req, res, next) => {

    const comp_code = req.params.code;
    const { industry_code } = req.body;

    if (!industry_code) {
        //If any of the inputs are empty, this should return a 400 status response.
        const e = new ExpressError('missing industry_codes from json (should be an array)', 400);
        return next(e);
    }
    try {
        const data = await db.query(`INSERT INTO companies_industries(comp_code, industry_code) 
                                    VALUES ($1, $2) RETURNING *`, [comp_code, industry_code]);
        return res.status(201).json({ industry: data.rows[0] });
    } catch (e) {
        console.log(e);
        return next(e);
    }
});

module.exports = router;