const { Parser } = require("json2csv");
const dayjs = require("dayjs");
/**
 *
 *
 * @class Product
 */
class Product {
  static productMatches = {
    Amazon: (txt, info = {}) => {
      const taxRate = 10.33347170333472;

      info.qty = parseInt(txt.match(/(\d*) of/)[1]);
      txt = txt.replace(/\d* of: /, "");
      txt = txt.replace(/Condition: \w*/, "");
      txt = txt.replace(/Sold by:.*\n/, "");
      info.preTaxItemCost = parseFloat(txt.match(/\$(\d*.\d\d)/)[1]).toFixed(2);
      info.taxCharged = parseFloat((info.preTaxItemCost / taxRate).toFixed(2));
      txt = txt.replace(/\$\d*.\d*/, "");
      txt = txt.replace(/\n/, "");

      info.description = txt.replace(/\n/gm, "").trim();
      return info;
    },
    "Best Buy": (txt, info = {}) => {

      txt = txt.replace(/Marcus Waters/gim, "");
      txt = txt.replace(/Shane Nash/gim, "");
      txt = txt.replace("Write a review and get 25 My Best Buy points", "");
      txt = txt.replace(/North Little Rock.*/gim, "");

      info.preTaxItemCost = parseFloat(
        txt.match(/Product Price:\$(\d*.\d*)/)[1]
      );
      txt = txt.replace(/^Product Price:.*\n/gm, "");

      info.itemNum = txt.match(/Model:(.*)/gm)[0].replace("Model:", "");
      txt = txt.replace(/^Model:.*\n/gm, "");

      info.sku = txt.match(/SKU:(\d*)/)[1];
      txt = txt.replace(/SKU:\d*\n/gm, "");

      info.taxCharged = parseFloat(
        txt.match(/Sales Tax, Fees & Surcharges:\$(\d*.\d*)/)[1]
      );
      txt = txt.replace(/Sales Tax, Fees & Surcharges:.*/, "");

      info.qty = parseFloat(txt.match(/Quantity:(\d*)/)[1]);
      txt = txt.replace(/Quantity:.*/, "");

      txt = txt.replace(/Item Total:.*/, "");
      txt = txt.replace(/\n/gm, "");

      info.description = txt;
      return info;
    },
    CDW: (txt, info = {}) => {
      const taxRate = 10.33347170333472;
      info.itemNum = txt.match(/Mfg Part \# : (.*)\n/)[1].trim();
      txt = txt.replace(/Mfg Part \# : .*\n/, "");

      info.preTaxItemCost = txt
        .match(/\$\d*.\d*/)[0]
        .trim()
        .replace("$", "");
      txt = txt.replace(info.preTaxItemCost, "");
      info.taxCharged = parseFloat((info.preTaxItemCost / taxRate).toFixed(2));

      info.totalCost = txt.match(/\$.*/)[0].trim().replace("$", "");
      txt = txt.replace(/^.*\$.*/gm, "");
      txt = txt.replace(/\n/gm, "");

      info.description = txt;
      return info;
    },
    "Office Depot": (txt, info = {}) => {
      if (txt.match(/Quantity:0/)) {
        return;
      }
      const taxRate = 10.52564102564103;

      txt = txt.replace(/Review\nThis Product/, "");

      info.preTaxItemCost = parseFloat(
        txt
          .match(/\$\d*.\d*/)[0]
          .trim()
          .replace("$", "")
      );
      txt = txt.replace(/\$\d*.\d*/, "");
      info.taxCharged = parseFloat((info.preTaxItemCost / taxRate).toFixed(2));

      info.itemNum = txt.match(/Item \# (\d*)/)[1];
      txt = txt.replace(/Item \# \d*/, "");

      info.qty = parseInt(txt.match(/^(?=\d)(\d*)(?=\1)/gm)[0]);

      txt = txt.replace(/^\d*$/gm, "");
      txt = txt.replace(/\n/gm, " ").trim();

      info.description = txt;
      return info;
    },
  };

  constructor(prodtxt, storeName) {
    this.storeName = storeName;
    const parser = Product.productMatches[this.storeName];
    const info = parser(prodtxt);
    Object.assign(this, info);
  }

  get isValid(){
    let valid = true;
    if(!Object.keys(Product.productMatches).find(key=>key==this.storeName) || !this.preTaxItemCost || !this.qty || !this.description){
      valid = false
    }

    return valid
  }
}

class Invoice {
  static invoiceMatches = [
    {
      name: "Amazon",
      matches: {
        store: /Amazon\.com/,
        orderNum: /Final Details for Order \#(\d*-\d*-\d*)/,
        invoiceDate: /Order Placed: (\D*\d*, \d\d\d\d)/,
        products: /\d of:[\s\S]*?\$\d*.\d*\n/gm,
      },
    },
    {
      name: "Best Buy",
      matches: {
        store: /www\.bestbuy\.com/,
        orderNum: /Order Number:(BBY\d*-\d*)/,
        invoiceDate: /Purchase Date:(... \d*, \d\d\d\d)/,
        products: /.*\n.*\nModel.*\nSKU.*\nQuant.*\nItem.*\nProd.*\nSales.*/gm,
      },
    },
    {
      name: "CDW",
      matches: {
        store: /www\.cdw\.com/,
        orderNum: /Order Number: (.*)\n/,
        invoiceDate: /ORDER DATE\n\s*(\d*\/\d*\/\d\d\d\d)/gm,
        products: /.*\n.*\n\s*Mfg.*\n.*/gm,
      },
    },
    {
      name: "Office Depot",
      matches: {
        store: /www\.officedepot\.com/,
        orderNum: /Order \#: (\d*-\d*)/,
        invoiceDate: /Order Placed: (\d*\/\d*\/\d\d\d\d)/,
        products: /.*\n.*Item \#.*\n.*\n.*/gm,
      },
    },
  ];

  static detectInvoice(pdftxt) {
    for (let i = 0; i < Invoice.invoiceMatches.length; i++) {
      const match = Invoice.invoiceMatches[i].matches.store;
      if (pdftxt.match(match)) {
        return Invoice.invoiceMatches[i];
      } else {
        continue;
      }
    }
    throw Error("Unable to determine invoice store name");
  }

  constructor(pdftxt) {
    this.invoiceTxt = pdftxt;
    const {name, matches} = Invoice.detectInvoice(this.invoiceTxt);

    this.storeName = name;
    this.products = [];

    const productArr = this.invoiceTxt.match(matches.products);

    if (productArr && productArr.length > 0) {
      productArr.forEach((p) => {
        const product = new Product(p, this.storeName);
        if (product.isValid) {
          this.addProduct(product);
        }
      });
    } else {
      console.log(`${this.storeName} invoice: No products detected`);
    }
    // console.log("store", pdftxt);

    this.invoiceNum = this.invoiceTxt.match(matches.orderNum)[1];
    this.invoiceDate = dayjs(
      this.invoiceTxt.match(matches.invoiceDate)[1]
    ).format("YYYY-MM-DD");
    // this.totalTax             = taxCost;
    // this.trackingNum = trackingNum||'';
  }

  get productArray() {
    return this.products.map((prod) => {
      return {
        Date: this.invoiceDate,
        Source: this.storeName,
        Returned: "",
        "Order Number": this.invoiceNum,
        "Items ordered": prod.description,
        Quantity: prod.qty,
        For: "",
        "IT Received By": "",
        "Per Item Cost": prod.preTaxItemCost,
        "Billing Frequency": "",
        "Tracking Number": this.trackingNum,
      };
    });
  }

  get productTabular() {
    return [
      ...this.productArray,
      {
        Date: this.invoiceDate,
        Source: this.storeName,
        "Order Number": this.invoiceNum,
        "Tracking Number": this.trackingNum,
        Subtotal: this.subtotal,
        "Tax Charged": this.taxCharged,
        "Grand Total": this.grandTotal,
      },
    ];
  }

  addProduct(product) {
    if (product instanceof Product) {
      this.products.push(product);
      return true ;
    }else{
      return false
    }
    
  }
  get subtotal() {
    let subtotal = 0;
    this.products.forEach((p) => {
      subtotal = subtotal + (p.preTaxItemCost * p.qty);
    });
    if(subtotal>0){
      return parseFloat(subtotal.toFixed(2));
    }else{
      return undefined
    }
    
  }
  get grandTotal() {
    let grandTotal = 0;
    this.products.forEach((p) => {
      grandTotal = grandTotal + ((p.preTaxItemCost+p.taxCharged) * p.qty);
    });
    if(grandTotal>0){
      return parseFloat(grandTotal.toFixed(2));
    }else{
      return undefined
    }
  }
  get taxCharged() {
    if(this.grandTotal && this.subtotal){
      return parseFloat((this.grandTotal - this.subtotal).toFixed(2))
    }else{
      return undefined
    }
    
  }
}

/** Class representing a collection of [Invoices]. */
class InvoiceCollection {

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
      "Subtotal",
      "Tax Charged",
      "Grand Total",
    ],
  };
  static parser = new Parser(Invoice.parserOps);

  /**
     * Create a point.
     * @param {Invoice[]} invoices - The x value.
     */
  constructor(invoices) {
    this.invoices = [];
    if (invoices && invoices.length > 0) {
      invoices.forEach((inv) => {
        this.addInvoice(inv);
      });
    }
  }
  /**
   *
   *
   * @param {Invoice} inv
   * @memberof InvoiceCollection
   */
  addInvoice(inv) {
    if (inv instanceof Invoice) {
      this.invoices.push(inv);
    } else {
      throw "addInvoice() only accepts [Invoice] as argument";
    }
  }
/**
 *
 *
 * @readonly
 * @memberof InvoiceCollection
 * @return {Object[]} An array of tabular invoices
 */
get tabularData(){
    let table = [];
  for (let i = 0; i < this.invoices.length; i++) {
    const invoice = this.invoices[i];
    table.push(...invoice.productTabular)    
  }
  return table
  }

  get csv() {
    return InvoiceCollection.parser.parse(this.tabularData);
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
      "Subtotal",
      "Tax Charged",
      "Grand Total",
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
module.exports.InvoiceCollection = InvoiceCollection;
