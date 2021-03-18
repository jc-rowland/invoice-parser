const path = require("path");
const fs = require("fs").promises;
const pdf = require("pdf-parse");
const Table = require("./table.js");
const dayjs = require("dayjs");
const folderPath = path.join(__dirname, "invoices");

const output = new Table();

function amazonParser(pdftxt) {
  const orderNum = pdftxt.match(/Final Details for Order \#(\d*-\d*-\d*)/)[1].trim();
  const orderDate = dayjs(pdftxt.match(/Order Placed: (\D*\d*, \d\d\d\d)/)[1].trim()).format(
    "MM/DD/YYYY"
  );
const orderMatch = new RegExp(/\d of:.*?\$\d*.\d\d/gm);  
const orders = pdftxt.match(orderMatch);
  if(!orders){
      console.log("NOFIND",pdftxt)
  }
  const trackingNum = "";
  orders.forEach((item) => {
    
    const qty = item.match(/(\d*) of/)[1];

    const descMatches = [
        /\d* of: (.*)Sold/,
        /\d* of: (.*)Cond/,
        /\d* of: (.*)\$/
    ]
    let itemDesc = ''

    for (let i = 0; i < descMatches.length; i++) {
        try {
            itemDesc = item.match(descMatches[i])[1];
        } catch (error) {
            continue
        }
        break
    }
    if(!itemDesc[1]){
        throw "No description match"
    }
    

    const cost = item.match(/\$(\d*.\d\d)/)[1];
    const newItem = {
      date: orderDate,
      source: "Amazon",
      orderNum: orderNum,
      itemDesc: itemDesc,
      qty: qty,
      cost: cost,
      trackingNum: trackingNum || "",
    };

    output.insert(newItem);
  });
}

async function readFiles(dirname) {
  const files = await fs.readdir(dirname);
    let promises = [];
    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const filePath = path.join(dirname,filename);
    let dataBuffer = await fs.readFile(filePath);
    const promise = pdf(dataBuffer).then(function(data) {
        amazonParser(data.text.replace(/ \n/,'').replace(/^ \n/gm,'').replace(/\n/gm,''))
        return true
    });
    promises.push(promise)
    }
    return await Promise.all(promises).then(()=>{
        return true
    })
}

async function app(){
    await readFiles(folderPath)
    await fs.writeFile( 'test.csv', output.csv )
};
app()




