const express = require("express");
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

router.post('/', async (req, res, next) => {
    try {
        const {code, name, description} = req.body;
        if (!code || !name || !description) {
            //If any of the inputs are empty, this should return a 400 status response.
            const e = new ExpressError('missing code, name, or description', 400);
            return next(e);
        }
        const data = await db.query(`INSERT INTO companies(code, name, description) VALUES ($1, $2, $3) RETURNING *`, [code, name, description]);
        return res.status(201).json({ company: data.rows[0] });
    } catch (e) {
        return next(e);
    }
});

router.get('/:code', async (req, res, next) => {
    try{
        //Return obj of company: {company: {code, name, description}}
        const data = await db.query(`SELECT code, name, description FROM companies WHERE code = '${req.params.code}'`);
        
        if (data.rows.length === 0) {
            //If the company given cannot be found, this should return a 404 status response.
            return next(companyNotFoundError);
        }

        return res.json({company: data.rows[0]});
    } catch (e) {
        return next(e);
    }
});

router.put('/:code', async (req, res, next) => {
    try {
        const code = req.params.code
        const { name, description } = req.body;

        if (!code || !name || !description) {
            //If any of the inputs are empty, this should return a 400 status response.
            const e = new ExpressError('missing code, name, or description', 400);
            return next(e);
        }
        const data = await db.query(`UPDATE companies SET name = $2, description = $3 WHERE code  = $1  RETURNING *`, [code, name, description]);
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
    try{
        const code = req.params.code;
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

module.exports = router;