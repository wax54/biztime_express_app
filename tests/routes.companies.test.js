process.env.NODE_ENV = 'test';

const request = require('supertest');
const slugify = require('slugify');
const app = require('../app');
const db = require('../db');

describe('Company API TESTS', () => {
    const apple = { name: 'Apple Computer', description: 'Maker of OSX.' };
    apple.code = slugify(apple.name, {lower: true});
    // beforeAll(async () => {
    //     await db.query("DROP TABLE IF EXISTS invoices;\
    //         DROP TABLE IF EXISTS companies;");
    //     await db.query("CREATE TABLE companies(\
    //         code text PRIMARY KEY, \
    //         name text NOT NULL UNIQUE, \
    //         description text);");
    //     await db.query("CREATE TABLE invoices(\
    //         id serial PRIMARY KEY,\
    //         comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,\
    //         amt float NOT NULL,\
    //         paid boolean DEFAULT false NOT NULL,\
    //         add_date date DEFAULT CURRENT_DATE NOT NULL,\
    //         paid_date date,\
    //         CONSTRAINT invoices_amt_check CHECK((amt > (0):: double precision)));"
    //         );
    // });

    beforeEach(async () => {

        await db.query('DELETE FROM companies_industries;');
        await db.query('DELETE FROM companies;');
        await db.query('DELETE FROM invoices;');
        await db.query('DELETE FROM industries;');
        await db.query(`INSERT INTO companies(code, name, description)\
        VALUES('${apple.code}', '${apple.name}', '${apple.description}');`);
    });

    afterEach(async () => {
    });

    afterAll(async () => {
        await db.end();
    });

    describe('GET /companies', () => {
        test('Recieves Companies', async () => {
            const res = await request(app).get('/companies');
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({companies:[{code: apple.code, name: apple.name}]});
        });
    });


    describe('GET /companies/:code', () => {
        test('Responds with company', async () => {
            const invoiceData = await db.query(`INSERT INTO invoices(comp_code, amt)\
            VALUES('${apple.code}', 400) RETURNING *;`);

            const invoiceId = invoiceData.rows[0].id;
            const res = await request(app).get(`/companies/${apple.code}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({company: {...apple, industries:[], invoices:[invoiceId]}});
        });

        test('throws 404 if no company', async () => {
            const res = await request(app).get('/companies/nadabing');
            expect(res.statusCode).toBe(404);
        });
    });


    describe('POST /companies', () => {
        const ibm = { name: 'IBM', description: 'Big blue.' };
        ibm.code = slugify(ibm.name, { lower: true });

        test('Returns the new company', async () => {

            const res = await request(app).post('/companies').send(ibm);
            expect(res.statusCode).toBe(201);
            expect(res.body).toEqual({ company: ibm });
        });
        test('Throws error if company exists', async () => {

            const res = await request(app).post('/companies').send(apple);
            expect(res.statusCode).toBe(400);
        });
        test('New company in companies', async () => {
            await request(app).post('/companies').send(ibm);

            const data = await db.query(`select * from companies WHERE code = '${ibm.code}'`);

            expect(data.rows.length).toBe(1);
            expect(data.rows[0]).toEqual(ibm);
        });

        test('throws 400 if missing inputs', async () => {

            let res = await request(app).post('/companies').send();
            expect(res.statusCode).toBe(400);

            res = await request(app).post('/companies').send({ code: ibm.code });
            expect(res.statusCode).toBe(400);

            res = await request(app).post('/companies').send({ name: ibm.name });
            expect(res.statusCode).toBe(400);

            res = await request(app).post('/companies').send({ description: ibm.description });
            expect(res.statusCode).toBe(400);

            const data = await db.query(`SELECT * FROM companies WHERE code = $1 OR name = $2 OR description = $3`, [ibm.code, ibm.name, ibm.description]);
            expect(data.rows.length).toBe(0);

        });
    });


    /**
    PUT /companies/[code]
    Edit existing company.

    Should return 404 if company cannot be found.

    Needs to be given JSON like: {name, description}

    Returns update company object: {company: {code, name, description}}
    */

    describe('PUT /companies/:name', () => {

        const updatedData = { name: "new Name", description: "New Description" };

        test('Responds with company', async () => {
            const res = await request(app)
                .put(`/companies/${apple.code}`)
                .send(updatedData);
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ company: {code: apple.code, ...updatedData} });
        })
        test('Updated company in companies', async () => {
            const res = await request(app)
                .put(`/companies/${apple.code}`)
                .send(updatedData);


            const data = await db.query("SELECT * FROM companies WHERE code = $1", [apple.code]);
            expect(data.rows.length).toBe(1);
            expect(data.rows[0]).toEqual({ code: apple.code, ...updatedData });
        });

        test('throws 400 if missing inputs', async () => {

            let res = await request(app).put(`/companies/${apple.code}`).send();
            expect(res.statusCode).toBe(400);

            res = await request(app).put(`/companies/${apple.code}`).send({ name: updatedData.name });
            expect(res.statusCode).toBe(400);

            res = await request(app).put(`/companies/${apple.code}`).send({ description: updatedData.description });
            expect(res.statusCode).toBe(400);

            const data = await db.query(`SELECT * FROM companies WHERE code = $1`, [apple.code]);
            expect(data.rows.length).toBe(1);
            
            expect(data.rows[0]).toEqual(apple);

        });

        test('throws 404 if no company', async () => {
            const res = await request(app).get('/companies/nadabing');
            expect(res.statusCode).toBe(404);
        })
    });
    /**
     * 
     * DELETE /companies/[code]
     * Deletes company.
     * 
     * Should return 404 if company cannot be found.
     * 
     * Returns {status: "deleted"}
     */

    describe('DELETE /companies/:code', () => {
        test('Responds with message Deleted', async () => {
            const res = await request(app)
                .delete(`/companies/${apple.code}`);
                
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ status: "deleted" });
        })

        test('throws 404 if no item', async () => {
            const res = await request(app).get('/companies/nadabing');
            expect(res.statusCode).toBe(404);
        })
    });
});