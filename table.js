const { Parser } = require("json2csv");

function amazonParser(pdftxt) {
  const orderNum = pdftxt
    .match(/Final Details for Order \#(\d*-\d*-\d*)/)[1]
    .trim();
  const orderDate = dayjs(
    pdftxt.match(/Order Placed: (\D*\d*, \d\d\d\d)/)[1].trim()
  ).format("MM/DD/YYYY");
  const orderMatch = new RegExp(/\d of:.*?\$\d*.\d\d/gm);
  const orders = pdftxt.match(orderMatch);
  if (!orders) {
    console.log("NOFIND", pdftxt);
  }
  const trackingNum = "";
  orders.forEach((item) => {

    const descMatches = [
      /\d* of: (.*)Sold/,
      /\d* of: (.*)Cond/,
      /\d* of: (.*)\$/,
    ];
    let itemDesc = "";

    for (let i = 0; i < descMatches.length; i++) {
      try {
        itemDesc = item.match(descMatches[i])[1];
      } catch (error) {
        continue;
      }
      break;
    }
    if (!itemDesc[1]) {
      throw "No description match";
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

class Product {
  static productMatches = {
    "Amazon":(txt)=>{
      let info = {isValid:true};      

      info.qty = parseInt(txt.match(/(\d*) of/)[1])
      txt = txt.replace(/\d* of: /,'')
      txt = txt.replace(/Condition: \w*/,'')
      txt = txt.replace(/Sold by:.*\n/,'')
      info.perItemCost = parseFloat(txt.match(/\$(\d*.\d\d)/)[1]);
      txt = txt.replace(/\$\d*.\d*/,'')
      txt = txt.replace(/\n/,'')

      info.description = txt
      return info
    },
    "Best Buy":(txt)=>{
      
      let info = {isValid:true};

      txt = txt.replace(/Marcus Waters/gmi,'')
      txt = txt.replace(/Shane Nash/gmi,'')
      txt = txt.replace("Write a review and get 25 My Best Buy points",'')
      txt = txt.replace(/North Little Rock.*/gmi,'')
      
      info.perItemCost = parseFloat(txt.match(/Product Price:\$(\d*.\d*)/)[1]);
      txt = txt.replace(/^Product Price:.*\n/gm,'')

      if(info.perItemCost === 0){
        return {isValid:false}
      }

      info.itemNum = txt.match(/Model:(.*)/gm)[0].replace("Model:",'');
      txt = txt.replace(/^Model:.*\n/gm,'')
      
      info.sku = txt.match(/SKU:(\d*)/)[1];
      txt = txt.replace(/SKU:\d*\n/gm,'');

      info.taxCharged = parseFloat(txt.match(/Sales Tax, Fees & Surcharges:\$(\d*.\d*)/)[1]);
      txt = txt.replace(/Sales Tax, Fees & Surcharges:.*/,'')

      info.qty = parseFloat(txt.match(/Quantity:(\d*)/)[1]);
      txt = txt.replace(/Quantity:.*/,'')

      txt = txt.replace(/Item Total:.*/,'')
      txt = txt.replace(/\n/gm,'')

      info.description = txt
      console.log(info)
      return {}
    },
    "CDW":(txt)=>{
      let info = {isValid:true};
      info.itemNum = txt.match(/Mfg Part \# : (.*)\n/)[1].trim();
      txt = txt.replace(/Mfg Part \# : .*\n/,'')

      info.perItemCost = txt.match(/\$\d*.\d*/)[0].trim().replace("$",'');
      txt = txt.replace(info.perItemCost,'')


      info.totalCost = txt.match(/\$.*/)[0].trim().replace("$",'')
      txt = txt.replace(/^.*\$.*/gm,'')
      txt = txt.replace(/\n/gm,'')

      info.description = txt
      return info
    },
    "Office Depot":(txt)=>{
      if(p.match(/Quantity:0/)){return}
      let info = {isValid:true};
      txt=txt.replace(/Review\nThis Product/,'')

      info.perItemCost = parseFloat(txt.match(/\$\d*.\d*/)[0].trim().replace("$",''));
      txt = txt.replace(/\$\d*.\d*/,'')

      if(info.perItemCost === 0){
        return {isValid:false}
      }

      info.itemNum = txt.match(/Item \# (\d*)/)[1];
      txt = txt.replace(/Item \# \d*/,'')
      
      info.qty = parseInt(txt.match(/^(?=\d)(\d*)(?=\1)/gm)[0])

      txt = txt.replace(/^\d*$/gm,'')
      txt = txt.replace(/\n/gm,' ').trim()

      info.description = txt
      return info
    },
  }
  constructor(prodtxt, storeName) {
    this.storeName = storeName;
    console.log(this.storeName)
    const parser = Product.productMatches[this.storeName];
    const info = parser(prodtxt)
    if(info.isValid)
    console.log(info)
    Object.assign(this,info)
  }
}

class Invoice {
  static invoiceMatches = [
    {
      name: "Amazon",
      matches: {
        store: /Amazon\.com/,
        orderNum: /Final Details for Order \#(\d*-\d*-\d*)/,
        orderDate: /Order Placed: (\D*\d*, \d\d\d\d)/,
        products: /\d of:[\s\S]*?\$\d*.\d*\n/gm,
      },
    },
    {
      name: "Best Buy",
      matches: {
        store: /www\.bestbuy\.com/,
        orderNum: /Order Number:(BBY\d*-\d*)/,
        orderDate: /Purchase Date:(... \d*, \d\d\d\d)/,
        products: /.*\n.*\nModel.*\nSKU.*\nQuant.*\nItem.*\nProd.*\nSales.*/gm,
      },
    },
    {
      name: "CDW",
      matches: {
        store: /www\.cdw\.com/,
        orderNum: /Order Number: (.*)\n/,
        orderDate: /ORDER DATE\n\s*(\d*\/\d*\/\d\d\d\d)/gm,
        products: /.*\n.*\n\s*Mfg.*\n.*/gm,
      },
    },
    {
      name: "Office Depot",
      matches: {
        store: /www\.officedepot\.com/,
        orderNum: /Order \#: (\d*-\d*)/,
        orderDate: /Order Placed: (\d*\/\d*\/\d\d\d\d)/,
        products: /.*\n.*Item \#.*\n.*\n.*/gm,
      },
    },
  ];

  static detectInvoice(pdftxt) {
    for (let i = 0; i < Invoice.invoiceMatches.length; i++) {
      const match = Invoice.invoiceMatches[i].matches.store;
      if (pdftxt.match(match)) {
        return Invoice.invoiceMatches[i]
      } else {
        continue;
      }
    }
    throw Error("Unable to determine invoice store name");
  }

  constructor(pdftxt) {
    pdftxt = pdftxt.replace(/ \n/gm,'')
    this.invoiceTxt = pdftxt;
    const store = Invoice.detectInvoice(this.invoiceTxt);
    this.storeName = store.name;
    pdftxt.replace(/ \n/gm,'').match(store.matches.products).forEach(p=>{
      const product = new Product(p,this.storeName);
      if(product.isValid){
        // this.addProduct(product)
      }
      
    })
    // console.log("store", pdftxt);
    this.products = [];
    // this["Order Number"]    = invoiceNum;
    // this["Tax"]             = taxCost;
    // this["Tracking Number"] = trackingNum||'';
  }

  addProduct(product) {
    if (product instanceof Product) {
      this.products.push(p);
      return;
    }
    try {
      product = new Product(
        product.qty,
        product.description,
        product.perItemCost
      );
      this.addProduct(p);
    } catch (error) {
      throw error;
    }
    return true;
  }
  get grandTotal() {
    let grandTotal = 0;
    this.products.forEach((p) => {
      grandTotal = grandTotal + p.perItemCost * p.qty;
    });
    return grandTotal;
  }
  get taxRate() {
    if (this.products.length === 0) {
      return 0.0;
    }
  }
}

class InvoiceCollection {
  constructor() {
    this.collection = [];
  }
  addInvoice(i) {
    if (i instanceof Invoice) {
      this.collection.push(i);
    } else {
      throw "addInvoice() only accepts [Invoice] as argument";
    }
  }
}

class Table {
  static parserOps = {
    fields: [
      "Date",
      "Source",
      "Returned",
      "Order Number",
      "Items ordered",
      "Quantity",
      "For",
      "IT Received By",
      "Per Item Cost",
      "Billing Frequency",
      "Tracking Number",
    ],
  };
  static parser = new Parser(Table.parserOps);

  constructor() {
    this.table = [];
  }

  insert({ date, source, orderNum, itemDesc, qty, cost, trackingNum }) {
    this.table.push({
      Date: date,
      Source: source,
      Returned: "",
      "Order Number": orderNum,
      "Items ordered": itemDesc,
      Quantity: parseInt(qty),
      For: "",
      "IT Received By": "",
      "Per Item Cost": cost,
      "Billing Frequency": "",
      "Tracking Number": trackingNum || "",
    });
  }
  get csv() {
    return Table.parser.parse(this.table);
  }
}

module.exports.Table = Table;
module.exports.Invoice = Invoice;
module.exports.Product = Product;
module.exports.InvoiceCollection = InvoiceCollection;
