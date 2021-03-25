const path = require("path");
const fs = require("fs").promises;
const pdf = require("pdf-parse");
const {Table,Invoice, InvoiceCollection} = require("./table.js");
const dayjs = require("dayjs");
const folderPath = path.join(__dirname, "invoices");

const output = new Table();

async function readFiles(dirname) {
  const files = await fs.readdir(dirname);
  let collection = new InvoiceCollection()
    let promises = [];
    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const filePath = path.join(dirname,filename);
    let dataBuffer = await fs.readFile(filePath);

    const promise = pdf(dataBuffer).then(function(data) {
        const invoice = new Invoice(data.text)
        collection.addInvoice(invoice)
        return true

    });
    promises.push(promise)
    }
    return await Promise.all(promises).then(()=>{
        return collection
    })
}

async function app(){
    const collection = await readFiles(folderPath)
    await fs.writeFile( 'test.csv', collection.csv )
};
app()




