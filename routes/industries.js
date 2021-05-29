const express = require("express");
const db = require("../db");

const ExpressError = require("../expressError");

const router = express.Router();
const industyNotFoundError = new ExpressError('industry not found', 404);

const resultNotPresent = pgResult => pgResult.rowCount === 0;

router.get('', async (req, res, next) => {
    try {
        const data = await db.query(`SELECT i.name AS industry_name, i.code AS industry_code, c.code AS comp_code
                                    FROM industries AS i
                                    LEFT JOIN companies_industries as c_i ON i.code = c_i.industry_code
                                    LEFT JOIN companies AS c ON c.code = c_i.comp_code`);
        /** reduce the JOIN table results into a nice Object that looks like
            {   [industry_name1]: {   
                    name: industry_name, 
                    code: industry_code, 
                    companies: [company_code, ... company_code]
                },
                ...,
                [industry_name]:{ ... },
            }
        */
        const industries = data.rows.reduce( (result, nextRow) => {
            const industry_code = nextRow.industry_code;
            const industry_name = nextRow.industry_name;
            const company = nextRow.comp_code;
            if(result[industry_code]){
                result[industry_code].companies.push(company);
            } else {
                result[industry_code] = {name: industry_name, code: industry_code, companies: [company]};
            }
            return result;
        }, {});
        // turn the industries object into an array. 
        const industriesJSON = [];
        for (let industry_code in industries){
            industriesJSON.push(industries[industry_code]);
        }   
        return res.json({ industries: industriesJSON });
    } catch (e) {
        return next(e);
    }
});

router.post('', async (req, res, next) => {

    const { code, name } = req.body;

    if (!code || !name ) {
        //If any of the inputs are empty, this should return a 400 status response.
        const e = new ExpressError('missing code or name from json', 400);
        return next(e);
    }
    try {
        const data = await db.query(`INSERT INTO industries(code, name) VALUES ($1, $2) RETURNING *`, [code, name]);
        return res.status(201).json({ industry: data.rows[0] });
    } catch (e) {
        return next(e);
    }
});





module.exports = router;