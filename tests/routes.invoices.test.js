process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Company API TESTS', () => {
    /** TEST SETUP */

    const invoices = [{   
            comp_code: "apple", 
            amt: 100, 
            paid: false,
            paid_date: undefined },
        {
            comp_code: "apple",
            amt: 200,
            paid: false,
            paid_date: undefined
        }, {
            comp_code: "apple",
            amt: 300,
            paid: true,
            paid_date: '2020-01-01'
        }];
 
    
    beforeEach( async() => {
        await db.query("DROP TABLE IF EXISTS invoices;\
            DROP TABLE IF EXISTS companies;");
        await db.query("CREATE TABLE companies(\
            code text PRIMARY KEY, \
            name text NOT NULL UNIQUE, \
            description text);");
        await db.query("CREATE TABLE invoices(\
            id serial PRIMARY KEY,\
            comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,\
            amt float NOT NULL,\
            paid boolean DEFAULT false NOT NULL,\
            add_date date DEFAULT CURRENT_DATE NOT NULL,\
            paid_date date,\
            CONSTRAINT invoices_amt_check CHECK((amt > (0):: double precision)));"
        );
    });

    beforeEach(async () => {
        await db.query(`DELETE FROM invoices;`);
        await db.query(`DELETE FROM companies;`);
        try {
            const apple = { code: "apple", name: 'Apple Computer', description: 'Maker of OSX.' };
            const ibm = { code: 'ibm', name: 'IBM', descrition: 'Big blue.' };

            await db.query(`INSERT INTO companies(code, name, description)\
            VALUES('${apple.code}', '${apple.name}', '${apple.description}'),\
                    ('${ibm.code}', '${ibm.name}', '${ibm.description}');`);

            for(let i in invoices){
                const inv = invoices[i];
                const data = await db.query(`INSERT INTO invoices(comp_code, amt, paid, paid_date)\
                VALUES($1, $2, $3, $4) RETURNING *;`, [apple.code, inv.amt, inv.paid, inv.paid_date]);
                invoices[i] = data.rows[0];
            }
        } catch (e) {
            console.error('error inserting test DATA', e);
        }
    });

    //VERY IMPORTANT OR ELSE CONNECTION WILL PERSIST AFTER CODE FINISHES
    afterAll(async () => { 
        await db.query("DROP TABLE IF EXISTS invoices;\
            DROP TABLE IF EXISTS companies;");
        await db.end();
    });





    /** TEST EXECUTION */

    describe('GET /invoices', () => {
        test('Recieves invoices', async () => {
            const res = await request(app).get('/invoices');
            expect(res.statusCode).toBe(200);
            const expectedResult = invoices.map(({ id, comp_code, amt, paid}) => 
                                                    ({id, comp_code, amt, paid}));
            expect(res.body).toEqual({invoices: expectedResult});
        });
    });

    /** GET /invoices/[id]
     * Returns obj on given invoice.
     * 
     * If invoice cannot be found, returns 404
     * 
     * Returns {invoice: 
     *              {
     *                  id, 
     *                  amt, 
     *                  paid, 
     *                  add_date, 
     *                  paid_date, 
     *                  company: 
     *                          {code, name, description}
     *              }
     *          } 
     */

    describe('GET /invoices/:code', () => {
        test('Responds with invoice', async () => {
            for(let invoice of invoices) {
                const res = await request(app).get(`/invoices/${invoice.id}`);
                expect(res.statusCode).toBe(200);
                let { id, comp_code, amt, paid, add_date, paid_date } = invoice;
                const companyData = await db.query("SELECT code, name, description FROM companies WHERE code = $1", [comp_code]);
                const company = companyData.rows[0];
                add_date = add_date.toJSON();
                if (paid_date)
                    paid_date = paid_date.toJSON();
                const expectedResult = {id, amt, paid, add_date, paid_date, company};
                expect(res.body).toEqual({invoice: expectedResult});
            }
        });

        test('throws 404 if no company', async () => {
            let res = await request(app).get('/invoices/nadabing');
            expect(res.statusCode).toBe(404);
            
            res = await request(app).get('/invoices/0');
            expect(res.statusCode).toBe(404);
        });
    });






    /** POST /invoices
     *  Adds an invoice.
     *  Needs to be passed in JSON body of: {comp_code, amt}
     *  Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}} 
     **/

    describe('POST /invoices', () => {
        const testInvoice = { comp_code:'ibm', amt: 400 };

        test('Returns the new invoice', async () => {

            const res = await request(app).post('/invoices').send(testInvoice);
            expect(res.statusCode).toBe(201);
            expect(res.body).toEqual({ invoice: {
                id: expect.any(Number),
                comp_code: testInvoice.comp_code,
                amt: testInvoice.amt,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            } });
        });

        test('New invoice in invoices', async () => {
            await request(app).post('/invoices').send(testInvoice);
            const data = await db.query(`select * from invoices WHERE comp_code = '${testInvoice.comp_code}' AND amt = '${testInvoice.amt}'`);
            expect(data.rows.length).toBe(1);
        });

        test('throws 400 if missing comp_code or amt', async () => {

            let res = await request(app).post('/invoices').send();
            expect(res.statusCode).toBe(400);

            res = await request(app).post('/invoices').send({ comp_code: testInvoice.comp_code });
            expect(res.statusCode).toBe(400);

            res = await request(app).post('/invoices').send({ amt: testInvoice.amt });
            expect(res.statusCode).toBe(400);

            const data = await db.query(`SELECT * FROM invoices WHERE comp_code = $1 OR amt = $2 `, [testInvoice.comp_code, testInvoice.amt]);
            expect(data.rows.length).toBe(0);

        });

        test('throws 404 if comp_code non existent', async () => {

            const res = await request(app).post('/invoices').send({...testInvoice, comp_code:'nadabing'});
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toEqual('company not found');

        });
    });



    // PUT / invoices / [id]
    // Updates an invoice.

    // If invoice cannot be found, returns a 404.

    // Needs to be passed in a JSON body of { amt }

    // Returns: { invoice: { id, comp_code, amt, paid, add_date, paid_date } }
    describe('PUT /invoices/:id', () => {

        const updatedData = { amt: 800};

        test('Responds with invoice', async () => {

            const res = await request(app)
                .put(`/invoices/${invoices[0].id}`)
                .send(updatedData);
            expect(res.statusCode).toBe(200);
            const expectedResult = {
                id: invoices[0].id,
                comp_code: invoices[0].comp_code,
                amt: updatedData.amt,
                paid: invoices[0].paid,
                add_date: invoices[0].add_date.toJSON(),
                paid_date: invoices[0].paid_date
            };
            expect(res.body).toEqual({ invoice:  expectedResult});
        });

        test('Updated invoice in invoices', async () => {
            const res = await request(app)
                .put(`/invoices/${invoices[0].id}`)
                .send(updatedData);


            const data = await db.query("SELECT * FROM invoices WHERE id= $1", [invoices[0].id]);
            expect(data.rows.length).toBe(1);
            expect(data.rows[0]).toEqual({ ...invoices[0], ...updatedData });
        });

        test('throws 400 if missing inputs', async () => {

            let res = await request(app).put(`/invoices/${invoices[0].id}`).send();
            expect(res.statusCode).toBe(400);

        });

        test('throws 404 if no invoice', async () => {
            let res = await request(app).get('/invoices/nadabing');
            expect(res.statusCode).toBe(404);
            res = await request(app).get('/invoices/0');
            expect(res.statusCode).toBe(404);
        })
    });

    /**
     *  DELETE /invoices/[id]
     *  Deletes an invoice.
     *  If invoice cannot be found, returns a 404.
     *  Returns: {status: "deleted"}

    */
    describe('DELETE /invoices/:id', () => {
        test('Responds with message Deleted', async () => {
            const res = await request(app)
                .delete(`/invoices/${invoices[0].id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ status: "deleted" });
        })
        test('invoice is deleted', async () => {
            await request(app)
                .delete(`/invoices/${invoices[0].id}`);
            const invoiceData = await db.query('SELECT * FROM invoices WHERE id = $1', [invoices[0].id]);
            expect(invoiceData.rows.length).toBe(0);
        });

        test('throws 404 if no item', async () => {
            let res = await request(app).get('/invoices/nadabing');
            expect(res.statusCode).toBe(404);

            res = await request(app).get('/invoices/0');
            expect(res.statusCode).toBe(404);
        })
    });
});