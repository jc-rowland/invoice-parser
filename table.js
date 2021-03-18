const { Parser } = require("json2csv");

class Product {
  constructor({qty, description, perItemCost}){
    if(!qty || !description ||perItemCost){
      throw "A product needs props: qty, description, perItemCost"
    }
    this.qty         = qty
    this.description = description
    this.perItemCost = perItemCost
  }
}

class Invoice {
  constructor(invoiceNum,taxCost,trackingNum){
         this.products      = []
    this["Order Number"]    = invoiceNum;
    this["Tax"]             = taxCost;
    this["Tracking Number"] = trackingNum||'';
  }

  addProduct(product){
    if(i instanceof Product){
      this.products.push(p)
      return
    }
      try {
        product = new Product(product.qty, product.description, product.perItemCost);
        this.addProduct(p)
      } catch (error) {
        throw error
      }
      return true
      
  }
}

class InvoiceCollection {
  constructor(){
    this.collection = []
  }
  addInvoice(i){
    if(i instanceof Invoice){
      this.collection.push(i)
    }else{
      throw "addInvoice() only accepts [Invoice] as argument"
    }
    
  }
}

module.exports = class Table {
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
      Date               : date,
      Source             : source,
      Returned           : "",
      "Order Number"     : orderNum,
      "Items ordered"    : itemDesc,
      Quantity           : parseInt(qty),
      For                : "",
      "IT Received By"   : "",
      "Per Item Cost"    : cost,
      "Billing Frequency": "",
      "Tracking Number"  : trackingNum || "",
    });
  }
  get csv() {
    return Table.parser.parse(this.table);
  }
};
